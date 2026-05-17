use async_trait::async_trait;
use chrono::{DateTime, Duration, Utc};
use domain::entities::license::{
    LicensePlan, LicenseState, LicenseSubscription, PlanLimits, StripeBillingSync,
};
use domain::error::{IoTBeeError, LicenseError};
use domain::outbound::license_repository::LicenseRepository;
use logging::AppLogger;
use std::sync::Arc;

static LOGGER: AppLogger = AppLogger::new("iot_bee::application::license_cases::cases");

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
}

#[async_trait]
pub trait LicenseUseCases {
    async fn status(&self, pipeline_count: u32) -> Result<LicenseStatusView, IoTBeeError>;
    async fn activate(
        &self,
        license_key: &str,
        pipeline_count: u32,
    ) -> Result<LicenseStatusView, IoTBeeError>;
    async fn deactivate(&self, pipeline_count: u32) -> Result<LicenseStatusView, IoTBeeError>;
    async fn sync_stripe_subscription(
        &self,
        sync: &StripeBillingSync,
        pipeline_count: u32,
    ) -> Result<LicenseStatusView, IoTBeeError>;
}

pub struct LicenseUseCasesImpl<T: LicenseRepository + Send + Sync> {
    repository: Arc<T>,
}

impl<T: LicenseRepository + Send + Sync> LicenseUseCasesImpl<T> {
    pub fn new(repository: Arc<T>) -> Self {
        Self { repository }
    }
}

#[async_trait]
impl<T> LicenseUseCases for LicenseUseCasesImpl<T>
where
    T: LicenseRepository + Send + Sync,
{
    async fn status(&self, pipeline_count: u32) -> Result<LicenseStatusView, IoTBeeError> {
        LOGGER.debug("license status use case called");
        let subscription = self.repository.get_subscription().await?;
        Ok(status_from_subscription(subscription, pipeline_count))
    }

    async fn activate(
        &self,
        license_key: &str,
        pipeline_count: u32,
    ) -> Result<LicenseStatusView, IoTBeeError> {
        LOGGER.debug("license activate use case called");
        let subscription = build_local_subscription(license_key)?;
        self.repository.upsert_subscription(&subscription).await?;
        Ok(status_from_subscription(Some(subscription), pipeline_count))
    }

    async fn deactivate(&self, pipeline_count: u32) -> Result<LicenseStatusView, IoTBeeError> {
        LOGGER.debug("license deactivate use case called");
        self.repository.deactivate_subscription().await?;
        Ok(status_from_subscription(None, pipeline_count))
    }

    async fn sync_stripe_subscription(
        &self,
        sync: &StripeBillingSync,
        pipeline_count: u32,
    ) -> Result<LicenseStatusView, IoTBeeError> {
        LOGGER.debug("license sync_stripe_subscription use case called");
        let subscription = self.repository.sync_stripe_subscription(sync).await?;
        Ok(status_from_subscription(Some(subscription), pipeline_count))
    }
}

pub async fn effective_limits<T>(repository: &T) -> Result<PlanLimits, IoTBeeError>
where
    T: LicenseRepository + Send + Sync + ?Sized,
{
    let subscription = repository.get_subscription().await?;
    let now = Utc::now();
    let plan = subscription
        .filter(|sub| sub.is_active_at(now))
        .map(|sub| sub.plan())
        .unwrap_or(LicensePlan::Free);
    Ok(plan.limits())
}

fn status_from_subscription(
    subscription: Option<LicenseSubscription>,
    pipeline_count: u32,
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

    LicenseStatusView {
        plan,
        state,
        limits: plan.limits(),
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
