use application::license_cases::cases::LicenseStatusView;
use chrono::{DateTime, Utc};
use domain::entities::license::{LicensePlan, LicenseState, StripeBillingSync};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct ActivateLicenseRequest {
    #[serde(rename = "licenseKey")]
    pub license_key: String,
}

#[derive(Serialize, ToSchema)]
pub struct PlanLimitsResponse {
    #[serde(rename = "maxPipelines")]
    pub max_pipelines: u32,
    #[serde(rename = "maxReplicasPerPipeline")]
    pub max_replicas_per_pipeline: u32,
    #[serde(rename = "includedMessagesMonthly")]
    pub included_messages_monthly: u64,
    #[serde(rename = "alertsEnabled")]
    pub alerts_enabled: bool,
    #[serde(rename = "premiumConnectors")]
    pub premium_connectors: bool,
    #[serde(rename = "multiUser")]
    pub multi_user: bool,
}

#[derive(Serialize, ToSchema)]
pub struct LicenseUsageResponse {
    pub pipelines: u32,
}

#[derive(Serialize, ToSchema)]
pub struct LicenseStatusResponse {
    pub plan: String,
    pub state: String,
    pub limits: PlanLimitsResponse,
    pub usage: LicenseUsageResponse,
    #[serde(rename = "licenseKeyLast4")]
    pub license_key_last4: Option<String>,
    #[serde(rename = "activatedAt")]
    pub activated_at: Option<String>,
    #[serde(rename = "expiresAt")]
    pub expires_at: Option<String>,
    #[serde(rename = "stripeCustomerId")]
    pub stripe_customer_id: Option<String>,
    #[serde(rename = "stripeSubscriptionId")]
    pub stripe_subscription_id: Option<String>,
    #[serde(rename = "stripeSubscriptionStatus")]
    pub stripe_subscription_status: Option<String>,
    #[serde(rename = "stripePaymentStatus")]
    pub stripe_payment_status: Option<String>,
    #[serde(rename = "currentPeriodEnd")]
    pub current_period_end: Option<String>,
    #[serde(rename = "cancelAtPeriodEnd")]
    pub cancel_at_period_end: bool,
    #[serde(rename = "latestInvoiceId")]
    pub latest_invoice_id: Option<String>,
    #[serde(rename = "amountCents")]
    pub amount_cents: Option<i64>,
    pub currency: Option<String>,
    #[serde(rename = "planSource")]
    pub plan_source: String,
    #[serde(rename = "isRestricted")]
    pub is_restricted: bool,
}

impl From<LicenseStatusView> for LicenseStatusResponse {
    fn from(value: LicenseStatusView) -> Self {
        Self {
            plan: value.plan.as_str().to_string(),
            state: value.state.as_str().to_string(),
            limits: PlanLimitsResponse {
                max_pipelines: value.limits.max_pipelines,
                max_replicas_per_pipeline: value.limits.max_replicas_per_pipeline,
                included_messages_monthly: value.limits.included_messages_monthly,
                alerts_enabled: value.limits.alerts_enabled,
                premium_connectors: value.limits.premium_connectors,
                multi_user: value.limits.multi_user,
            },
            usage: LicenseUsageResponse {
                pipelines: value.usage.pipelines,
            },
            license_key_last4: value.license_key_last4,
            activated_at: value.activated_at.map(|dt| dt.to_rfc3339()),
            expires_at: value.expires_at.map(|dt| dt.to_rfc3339()),
            stripe_customer_id: value.stripe_customer_id,
            stripe_subscription_id: value.stripe_subscription_id,
            stripe_subscription_status: value.stripe_subscription_status,
            stripe_payment_status: value.stripe_payment_status,
            current_period_end: value.current_period_end.map(|dt| dt.to_rfc3339()),
            cancel_at_period_end: value.cancel_at_period_end,
            latest_invoice_id: value.latest_invoice_id,
            amount_cents: value.amount_cents,
            currency: value.currency,
            plan_source: value.plan_source.to_string(),
            is_restricted: value.is_restricted,
        }
    }
}

#[derive(Deserialize, ToSchema)]
pub struct StripeBillingSyncRequest {
    #[serde(rename = "licenseKey")]
    pub license_key: String,
    pub plan: String,
    pub state: String,
    #[serde(rename = "stripeCustomerId")]
    pub stripe_customer_id: Option<String>,
    #[serde(rename = "stripeSubscriptionId")]
    pub stripe_subscription_id: Option<String>,
    #[serde(rename = "stripeCheckoutSessionId")]
    pub stripe_checkout_session_id: Option<String>,
    #[serde(rename = "stripeSubscriptionStatus")]
    pub stripe_subscription_status: Option<String>,
    #[serde(rename = "stripePaymentStatus")]
    pub stripe_payment_status: Option<String>,
    #[serde(rename = "currentPeriodEnd")]
    pub current_period_end: Option<String>,
    #[serde(rename = "cancelAtPeriodEnd", default)]
    pub cancel_at_period_end: bool,
    #[serde(rename = "latestInvoiceId")]
    pub latest_invoice_id: Option<String>,
    #[serde(rename = "amountCents")]
    pub amount_cents: Option<i64>,
    pub currency: Option<String>,
    #[serde(rename = "stripeEventId")]
    pub stripe_event_id: Option<String>,
    #[serde(rename = "eventType")]
    pub event_type: Option<String>,
    #[serde(rename = "eventPayload")]
    pub event_payload: Option<String>,
}

impl TryFrom<StripeBillingSyncRequest> for StripeBillingSync {
    type Error = domain::error::IoTBeeError;

    fn try_from(value: StripeBillingSyncRequest) -> Result<Self, Self::Error> {
        let current_period_end = value
            .current_period_end
            .as_deref()
            .map(DateTime::parse_from_rfc3339)
            .transpose()
            .map_err(|e| domain::error::LicenseError::Persistence {
                reason: format!("invalid currentPeriodEnd: {e}"),
            })?
            .map(|dt| dt.with_timezone(&Utc));

        Ok(StripeBillingSync {
            license_key: value.license_key,
            plan: LicensePlan::from_str(&value.plan)?,
            state: LicenseState::from_str(&value.state)?,
            stripe_customer_id: value.stripe_customer_id,
            stripe_subscription_id: value.stripe_subscription_id,
            stripe_checkout_session_id: value.stripe_checkout_session_id,
            stripe_subscription_status: value.stripe_subscription_status,
            stripe_payment_status: value.stripe_payment_status,
            current_period_end,
            cancel_at_period_end: value.cancel_at_period_end,
            latest_invoice_id: value.latest_invoice_id,
            amount_cents: value.amount_cents,
            currency: value.currency,
            stripe_event_id: value.stripe_event_id,
            event_type: value.event_type,
            event_payload: value.event_payload,
        })
    }
}
