use std::sync::Arc;

use async_trait::async_trait;
use chrono::{Datelike, TimeZone, Utc};
use domain::audit::entities::audit_event::NewAuditEvent;
use domain::audit::outbound::audit_repository::AuditRepository;
use domain::auth::outbound::user_repository::UserRepository;
use domain::error::IoTBeeError;
use domain::plan::outbound::plan_repository::PlanRepository;
use domain::usage::entities::{UsageEvent, UsageQuotaState, UsageScope, UsageView};
use domain::usage::outbound::{UsageMeter, UsageRepository};
use logging::AppLogger;

use crate::license_cases::cases::effective_limits;
use crate::notifications_cases::cases::NotificationsUseCases;
use domain::outbound::license_repository::LicenseRepository;

static LOGGER: AppLogger = AppLogger::new("iot_bee::application::usage_cases");

#[async_trait]
pub trait UsageUseCases: UsageMeter {
    async fn current(&self, organization_id: i64) -> Result<UsageView, IoTBeeError>;
    async fn by_pipeline(&self, organization_id: i64) -> Result<Vec<UsageView>, IoTBeeError>;
}

pub struct UsageUseCasesImpl<L: LicenseRepository + Send + Sync> {
    usage: Arc<dyn UsageRepository>,
    licenses: Arc<L>,
    plans: Arc<dyn PlanRepository>,
    users: Arc<dyn UserRepository>,
    notifications: Arc<dyn NotificationsUseCases>,
    audit: Arc<dyn AuditRepository>,
}

impl<L: LicenseRepository + Send + Sync> UsageUseCasesImpl<L> {
    pub fn new(
        usage: Arc<dyn UsageRepository>,
        licenses: Arc<L>,
        plans: Arc<dyn PlanRepository>,
        users: Arc<dyn UserRepository>,
        notifications: Arc<dyn NotificationsUseCases>,
        audit: Arc<dyn AuditRepository>,
    ) -> Self {
        Self {
            usage,
            licenses,
            plans,
            users,
            notifications,
            audit,
        }
    }

    async fn included(&self, organization_id: i64) -> Result<u64, IoTBeeError> {
        Ok(
            effective_limits(self.licenses.as_ref(), self.plans.as_ref(), organization_id)
                .await?
                .limits
                .included_messages_monthly,
        )
    }

    fn cycle(now: chrono::DateTime<Utc>) -> (chrono::DateTime<Utc>, chrono::DateTime<Utc>) {
        let start = Utc
            .with_ymd_and_hms(now.year(), now.month(), 1, 0, 0, 0)
            .unwrap();
        let end = if now.month() == 12 {
            Utc.with_ymd_and_hms(now.year() + 1, 1, 1, 0, 0, 0).unwrap()
        } else {
            Utc.with_ymd_and_hms(now.year(), now.month() + 1, 1, 0, 0, 0)
                .unwrap()
        };
        (start, end)
    }

    async fn view(
        &self,
        organization_id: i64,
        pipeline_id: Option<u32>,
    ) -> Result<UsageView, IoTBeeError> {
        let now = Utc::now();
        let (cycle_start, cycle_end) = Self::cycle(now);
        let included_messages = self.included(organization_id).await?;
        let counters = self.usage.current_month(organization_id, now).await?;
        let quota_state = if counters.messages_delivered >= included_messages {
            UsageQuotaState::Exhausted
        } else if included_messages > 0
            && counters.messages_delivered.saturating_mul(100)
                >= included_messages.saturating_mul(80)
        {
            UsageQuotaState::Warning
        } else {
            UsageQuotaState::Available
        };
        Ok(UsageView {
            organization_id,
            pipeline_id,
            cycle_start,
            cycle_end,
            included_messages,
            counters,
            quota_state,
        })
    }

    async fn notify_threshold(&self, view: &UsageView) {
        let percentage = if view.included_messages == 0 {
            100
        } else {
            view.counters.messages_delivered.saturating_mul(100) / view.included_messages
        };
        let threshold = if percentage > 100 {
            101
        } else if percentage >= 100 {
            100
        } else if percentage >= 80 {
            80
        } else {
            return;
        };
        let claimed = match self
            .usage
            .claim_notification(view.organization_id, view.cycle_start, threshold)
            .await
        {
            Ok(claimed) => claimed,
            Err(error) => {
                LOGGER.warn(&format!("No se pudo deduplicar alerta de uso: {error}"));
                return;
            }
        };
        if !claimed {
            return;
        }
        let action = format!("usage quota {threshold}%");
        if let Err(error) = self
            .audit
            .record(NewAuditEvent {
                organization_id: Some(view.organization_id),
                user_id: None,
                user_email: None,
                user_role: None,
                action,
                method: "SYSTEM".into(),
                path: "/usage".into(),
                status_code: Some(200),
                ip_address: None,
            })
            .await
        {
            LOGGER.warn(&format!("No se pudo auditar alerta de uso: {error}"));
        }
        if let Ok(Some(admin)) = self.users.find_admin_by_org_id(view.organization_id).await {
            if let Err(error) = self
                .notifications
                .send_usage_quota(
                    &admin.email,
                    view.counters.messages_delivered,
                    view.included_messages,
                )
                .await
            {
                LOGGER.warn(&format!("No se pudo notificar cuota de uso: {error}"));
            }
        }
    }
}

#[async_trait]
impl<L: LicenseRepository + Send + Sync> UsageMeter for UsageUseCasesImpl<L> {
    async fn allow_processing(&self, scope: UsageScope) -> Result<bool, IoTBeeError> {
        let now = Utc::now();
        let included = self.included(scope.organization_id).await?;
        let allowed = self
            .usage
            .reserve_processing_slot(scope.organization_id, now, included)
            .await?;
        if !allowed {
            let view = self.view(scope.organization_id, None).await?;
            self.notify_threshold(&view).await;
        }
        Ok(allowed)
    }

    async fn record(&self, scope: UsageScope, event: UsageEvent) -> Result<(), IoTBeeError> {
        let now = Utc::now();
        self.usage.record(scope, now, event).await?;
        if matches!(
            event,
            UsageEvent::Invalid | UsageEvent::Failed | UsageEvent::Delivered { .. }
        ) {
            self.usage
                .release_processing_slot(scope.organization_id, now)
                .await?;
        }
        if matches!(event, UsageEvent::Delivered { .. }) {
            let view = self.view(scope.organization_id, None).await?;
            self.notify_threshold(&view).await;
        }
        Ok(())
    }
}

#[async_trait]
impl<L: LicenseRepository + Send + Sync> UsageUseCases for UsageUseCasesImpl<L> {
    async fn current(&self, organization_id: i64) -> Result<UsageView, IoTBeeError> {
        self.view(organization_id, None).await
    }

    async fn by_pipeline(&self, organization_id: i64) -> Result<Vec<UsageView>, IoTBeeError> {
        let now = Utc::now();
        let (cycle_start, cycle_end) = Self::cycle(now);
        let included_messages = self.included(organization_id).await?;
        let rows = self
            .usage
            .current_month_by_pipeline(organization_id, now)
            .await?;
        Ok(rows
            .into_iter()
            .map(|(pipeline_id, counters)| UsageView {
                organization_id,
                pipeline_id: Some(pipeline_id),
                cycle_start,
                cycle_end,
                included_messages,
                counters,
                quota_state: if counters.messages_delivered >= included_messages {
                    UsageQuotaState::Exhausted
                } else if included_messages > 0
                    && counters.messages_delivered.saturating_mul(100)
                        >= included_messages.saturating_mul(80)
                {
                    UsageQuotaState::Warning
                } else {
                    UsageQuotaState::Available
                },
            })
            .collect())
    }
}
