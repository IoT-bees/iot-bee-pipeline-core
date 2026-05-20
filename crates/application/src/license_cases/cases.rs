use async_trait::async_trait;
use chrono::{DateTime, Duration, Utc};
use domain::auth::outbound::user_repository::UserRepository;
use domain::entities::license::{
    BillingEvent, LicensePlan, LicenseState, LicenseSubscription, PlanLimits, StripeBillingSync,
};
use domain::error::{IoTBeeError, LicenseError};
use domain::outbound::license_repository::LicenseRepository;
use domain::plan::outbound::plan_repository::PlanRepository;
use logging::AppLogger;
use serde::Deserialize;
use std::sync::Arc;

use crate::notifications_cases::cases::NotificationsUseCases;

static LOGGER: AppLogger = AppLogger::new("iot_bee::application::license_cases::cases");

const CUSTOMER_PORTAL_URL: &str = "https://app.iotbees.dev/billing";

#[derive(Clone, Debug)]
pub struct LicenseUsage {
    pub pipelines: u32,
}

#[derive(Clone, Debug)]
pub struct LicenseStatusView {
    pub plan: LicensePlan,
    pub state: LicenseState,
    pub limits: PlanLimits,
    pub usage: LicenseUsage,
    pub license_key_last4: Option<String>,
    pub activated_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub stripe_customer_id: Option<String>,
    pub stripe_subscription_id: Option<String>,
    pub stripe_subscription_status: Option<String>,
    pub stripe_payment_status: Option<String>,
    pub current_period_end: Option<DateTime<Utc>>,
    pub cancel_at_period_end: bool,
    pub latest_invoice_id: Option<String>,
    pub amount_cents: Option<i64>,
    pub currency: Option<String>,
    pub plan_source: &'static str,
    pub is_restricted: bool,
}

#[async_trait]
pub trait LicenseUseCases {
    async fn status(
        &self,
        organization_id: i64,
        pipeline_count: u32,
    ) -> Result<LicenseStatusView, IoTBeeError>;
    async fn activate(
        &self,
        organization_id: i64,
        license_key: &str,
        pipeline_count: u32,
    ) -> Result<LicenseStatusView, IoTBeeError>;
    async fn deactivate(
        &self,
        organization_id: i64,
        pipeline_count: u32,
    ) -> Result<LicenseStatusView, IoTBeeError>;
    async fn sync_stripe_subscription(
        &self,
        organization_id: i64,
        sync: &StripeBillingSync,
        pipeline_count: u32,
    ) -> Result<LicenseStatusView, IoTBeeError>;
    async fn list_billing_events(&self, limit: i64) -> Result<Vec<BillingEvent>, IoTBeeError>;
    async fn retry_billing_event(&self, id: i64) -> Result<BillingEvent, IoTBeeError>;
}

#[derive(Deserialize)]
struct StripeEventJson {
    #[serde(rename = "licenseKey", alias = "license_key")]
    license_key: String,
    plan: String,
    state: String,
    #[serde(rename = "stripeCustomerId", alias = "stripe_customer_id")]
    stripe_customer_id: Option<String>,
    #[serde(rename = "stripeSubscriptionId", alias = "stripe_subscription_id")]
    stripe_subscription_id: Option<String>,
    #[serde(
        rename = "stripeCheckoutSessionId",
        alias = "stripe_checkout_session_id"
    )]
    stripe_checkout_session_id: Option<String>,
    #[serde(
        rename = "stripeSubscriptionStatus",
        alias = "stripe_subscription_status"
    )]
    stripe_subscription_status: Option<String>,
    #[serde(rename = "stripePaymentStatus", alias = "stripe_payment_status")]
    stripe_payment_status: Option<String>,
    #[serde(rename = "currentPeriodEnd", alias = "current_period_end")]
    current_period_end: Option<String>,
    #[serde(rename = "cancelAtPeriodEnd", alias = "cancel_at_period_end", default)]
    cancel_at_period_end: bool,
    #[serde(rename = "latestInvoiceId", alias = "latest_invoice_id")]
    latest_invoice_id: Option<String>,
    #[serde(rename = "amountCents", alias = "amount_cents")]
    amount_cents: Option<i64>,
    currency: Option<String>,
    #[serde(rename = "stripeEventId", alias = "stripe_event_id")]
    stripe_event_id: Option<String>,
    #[serde(rename = "eventType", alias = "event_type")]
    event_type: Option<String>,
    #[serde(rename = "eventPayload", alias = "event_payload")]
    event_payload: Option<String>,
}

fn parse_billing_event_payload(raw: &str) -> Result<StripeBillingSync, IoTBeeError> {
    let parsed: StripeEventJson =
        serde_json::from_str(raw).map_err(|e| LicenseError::Persistence {
            reason: format!("invalid billing event payload: {e}"),
        })?;
    let current_period_end = parsed
        .current_period_end
        .as_deref()
        .map(DateTime::parse_from_rfc3339)
        .transpose()
        .map_err(|e| LicenseError::Persistence {
            reason: format!("invalid currentPeriodEnd: {e}"),
        })?
        .map(|dt| dt.with_timezone(&Utc));
    Ok(StripeBillingSync {
        license_key: parsed.license_key,
        plan: LicensePlan::from_str(&parsed.plan)?,
        state: LicenseState::from_str(&parsed.state)?,
        stripe_customer_id: parsed.stripe_customer_id,
        stripe_subscription_id: parsed.stripe_subscription_id,
        stripe_checkout_session_id: parsed.stripe_checkout_session_id,
        stripe_subscription_status: parsed.stripe_subscription_status,
        stripe_payment_status: parsed.stripe_payment_status,
        current_period_end,
        cancel_at_period_end: parsed.cancel_at_period_end,
        latest_invoice_id: parsed.latest_invoice_id,
        amount_cents: parsed.amount_cents,
        currency: parsed.currency,
        stripe_event_id: parsed.stripe_event_id,
        event_type: parsed.event_type,
        event_payload: parsed.event_payload,
    })
}

pub struct LicenseUseCasesImpl<T: LicenseRepository + Send + Sync> {
    repository: Arc<T>,
    users: Arc<dyn UserRepository>,
    notifications: Arc<dyn NotificationsUseCases>,
    plan_repository: Arc<dyn PlanRepository>,
}

impl<T: LicenseRepository + Send + Sync> LicenseUseCasesImpl<T> {
    pub fn new(
        repository: Arc<T>,
        users: Arc<dyn UserRepository>,
        notifications: Arc<dyn NotificationsUseCases>,
        plan_repository: Arc<dyn PlanRepository>,
    ) -> Self {
        Self {
            repository,
            users,
            notifications,
            plan_repository,
        }
    }
}

#[async_trait]
impl<T> LicenseUseCases for LicenseUseCasesImpl<T>
where
    T: LicenseRepository + Send + Sync,
{
    async fn status(
        &self,
        organization_id: i64,
        pipeline_count: u32,
    ) -> Result<LicenseStatusView, IoTBeeError> {
        LOGGER.debug("license status use case called");
        let subscription = self.repository.get_subscription().await?;
        let limits = effective_limits(
            self.repository.as_ref(),
            self.plan_repository.as_ref(),
            organization_id,
        )
        .await?;
        Ok(status_from_subscription(
            subscription,
            pipeline_count,
            limits,
        ))
    }

    async fn activate(
        &self,
        organization_id: i64,
        license_key: &str,
        pipeline_count: u32,
    ) -> Result<LicenseStatusView, IoTBeeError> {
        LOGGER.debug("license activate use case called");
        let subscription = build_local_subscription(license_key)?;
        self.repository.upsert_subscription(&subscription).await?;
        let limits = effective_limits(
            self.repository.as_ref(),
            self.plan_repository.as_ref(),
            organization_id,
        )
        .await?;
        Ok(status_from_subscription(
            Some(subscription),
            pipeline_count,
            limits,
        ))
    }

    async fn deactivate(
        &self,
        organization_id: i64,
        pipeline_count: u32,
    ) -> Result<LicenseStatusView, IoTBeeError> {
        LOGGER.debug("license deactivate use case called");
        self.repository.deactivate_subscription().await?;
        let limits = effective_limits(
            self.repository.as_ref(),
            self.plan_repository.as_ref(),
            organization_id,
        )
        .await?;
        Ok(status_from_subscription(None, pipeline_count, limits))
    }

    async fn sync_stripe_subscription(
        &self,
        organization_id: i64,
        sync: &StripeBillingSync,
        pipeline_count: u32,
    ) -> Result<LicenseStatusView, IoTBeeError> {
        LOGGER.debug("license sync_stripe_subscription use case called");
        let subscription = self.repository.sync_stripe_subscription(sync).await?;

        if sync.stripe_payment_status.as_deref() == Some("failed") {
            let plan_name = subscription.plan().as_str().to_string();
            let users = self.users.clone();
            let notifications = self.notifications.clone();
            tokio::spawn(async move {
                match users.find_admin_by_org_id(1).await {
                    Ok(Some(admin)) => {
                        if let Err(e) = notifications
                            .send_payment_failed(&admin.email, &plan_name, CUSTOMER_PORTAL_URL)
                            .await
                        {
                            LOGGER.warn(format!("payment_failed email failed: {e}"));
                        }
                    }
                    Ok(None) => {
                        LOGGER.warn("payment_failed email skipped: no admin user found");
                    }
                    Err(e) => {
                        LOGGER.warn(format!(
                            "payment_failed email skipped: admin lookup failed: {e}"
                        ));
                    }
                }
            });
        }

        let limits = effective_limits(
            self.repository.as_ref(),
            self.plan_repository.as_ref(),
            organization_id,
        )
        .await?;
        Ok(status_from_subscription(
            Some(subscription),
            pipeline_count,
            limits,
        ))
    }

    async fn list_billing_events(&self, limit: i64) -> Result<Vec<BillingEvent>, IoTBeeError> {
        self.repository.list_billing_events(limit).await
    }

    async fn retry_billing_event(&self, id: i64) -> Result<BillingEvent, IoTBeeError> {
        let event =
            self.repository
                .get_billing_event(id)
                .await?
                .ok_or(LicenseError::Persistence {
                    reason: format!("billing event {id} not found"),
                })?;
        match parse_billing_event_payload(&event.payload) {
            Ok(sync) => match self.repository.sync_stripe_subscription(&sync).await {
                Ok(_) => {
                    self.repository
                        .mark_billing_event_processed(id, true, None)
                        .await?;
                }
                Err(e) => {
                    let msg = e.to_string();
                    self.repository
                        .mark_billing_event_processed(id, false, Some(&msg))
                        .await?;
                    return Err(e);
                }
            },
            Err(e) => {
                let msg = e.to_string();
                self.repository
                    .mark_billing_event_processed(id, false, Some(&msg))
                    .await?;
                return Err(e);
            }
        }
        self.repository.get_billing_event(id).await?.ok_or_else(|| {
            LicenseError::Persistence {
                reason: format!("billing event {id} disappeared after retry"),
            }
            .into()
        })
    }
}

#[derive(Clone, Debug)]
pub struct EffectiveLimits {
    pub limits: PlanLimits,
    /// `"catalog"` when the limits were read from the plans table for the
    /// caller's organization, `"fallback-enum"` when the catalog had no row
    /// and the legacy hardcoded plan defaults kicked in.
    pub source: &'static str,
}

pub async fn effective_limits<L, P>(
    license_repo: &L,
    plan_repo: &P,
    organization_id: i64,
) -> Result<EffectiveLimits, IoTBeeError>
where
    L: LicenseRepository + Send + Sync + ?Sized,
    P: PlanRepository + ?Sized,
{
    let subscription = license_repo.get_subscription().await?;
    let now = Utc::now();
    let plan = subscription
        .filter(|sub| sub.is_active_at(now))
        .map(|sub| sub.plan())
        .unwrap_or(LicensePlan::Free);
    let slug = plan.as_str();

    if let Some(catalog) = plan_repo.find_effective(slug, organization_id).await? {
        return Ok(EffectiveLimits {
            limits: catalog.to_limits(),
            source: "catalog",
        });
    }

    Ok(EffectiveLimits {
        limits: plan.limits(),
        source: "fallback-enum",
    })
}

fn status_from_subscription(
    subscription: Option<LicenseSubscription>,
    pipeline_count: u32,
    effective: EffectiveLimits,
) -> LicenseStatusView {
    let now = Utc::now();
    let effective_subscription = subscription.filter(|sub| sub.is_active_at(now));
    let plan = effective_subscription
        .as_ref()
        .map(|sub| sub.plan())
        .unwrap_or(LicensePlan::Free);
    let state = effective_subscription
        .as_ref()
        .map(|sub| sub.state())
        .unwrap_or(LicenseState::Inactive);
    let is_restricted = effective_subscription
        .as_ref()
        .is_some_and(|sub| sub.is_restricted());

    LicenseStatusView {
        plan,
        state,
        limits: effective.limits,
        usage: LicenseUsage {
            pipelines: pipeline_count,
        },
        license_key_last4: effective_subscription
            .as_ref()
            .map(|sub| last4(sub.license_key())),
        activated_at: effective_subscription
            .as_ref()
            .map(|sub| sub.activated_at()),
        expires_at: effective_subscription
            .as_ref()
            .and_then(|sub| sub.expires_at().or_else(|| sub.current_period_end())),
        stripe_customer_id: effective_subscription
            .as_ref()
            .and_then(|sub| sub.stripe_customer_id().map(str::to_string)),
        stripe_subscription_id: effective_subscription
            .as_ref()
            .and_then(|sub| sub.stripe_subscription_id().map(str::to_string)),
        stripe_subscription_status: effective_subscription
            .as_ref()
            .and_then(|sub| sub.stripe_subscription_status().map(str::to_string)),
        stripe_payment_status: effective_subscription
            .as_ref()
            .and_then(|sub| sub.stripe_payment_status().map(str::to_string)),
        current_period_end: effective_subscription
            .as_ref()
            .and_then(|sub| sub.current_period_end()),
        cancel_at_period_end: effective_subscription
            .as_ref()
            .is_some_and(|sub| sub.cancel_at_period_end()),
        latest_invoice_id: effective_subscription
            .as_ref()
            .and_then(|sub| sub.latest_invoice_id().map(str::to_string)),
        amount_cents: effective_subscription
            .as_ref()
            .and_then(|sub| sub.amount_cents()),
        currency: effective_subscription
            .as_ref()
            .and_then(|sub| sub.currency().map(str::to_string)),
        plan_source: effective.source,
        is_restricted,
    }
}

fn build_local_subscription(license_key: &str) -> Result<LicenseSubscription, IoTBeeError> {
    let normalized = license_key.trim().to_ascii_uppercase();
    if normalized.len() < 18 {
        return Err(LicenseError::InvalidKey.into());
    }

    let plan = if normalized.starts_with("IOTBEE-STARTER-") {
        LicensePlan::Starter
    } else if normalized.starts_with("IOTBEE-PRO-") {
        LicensePlan::Pro
    } else if normalized.starts_with("IOTBEE-ENTERPRISE-") {
        LicensePlan::Enterprise
    } else {
        return Err(LicenseError::InvalidKey.into());
    };

    let now = Utc::now();
    Ok(LicenseSubscription::new(
        normalized,
        plan,
        LicenseState::Active,
        now,
        Some(now + Duration::days(365)),
        now,
    ))
}

fn last4(value: &str) -> String {
    value
        .chars()
        .rev()
        .take(4)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect()
}
