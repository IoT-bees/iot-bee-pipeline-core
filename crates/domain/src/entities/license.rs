use crate::error::{IoTBeeError, LicenseError};
use chrono::{DateTime, Utc};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LicensePlan {
    Free,
    Starter,
    Pro,
    Enterprise,
}

impl LicensePlan {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Free => "free",
            Self::Starter => "starter",
            Self::Pro => "pro",
            Self::Enterprise => "enterprise",
        }
    }

    pub fn from_str(value: &str) -> Result<Self, IoTBeeError> {
        match value.to_ascii_lowercase().as_str() {
            "free" => Ok(Self::Free),
            "starter" => Ok(Self::Starter),
            "pro" => Ok(Self::Pro),
            "enterprise" => Ok(Self::Enterprise),
            _ => Err(LicenseError::InvalidPlan {
                plan: value.to_string(),
            }
            .into()),
        }
    }

    pub fn limits(self) -> PlanLimits {
        match self {
            Self::Free => PlanLimits {
                max_pipelines: 3,
                max_replicas_per_pipeline: 2,
                alerts_enabled: false,
                premium_connectors: false,
                multi_user: false,
            },
            Self::Starter => PlanLimits {
                max_pipelines: 10,
                max_replicas_per_pipeline: 4,
                alerts_enabled: false,
                premium_connectors: false,
                multi_user: false,
            },
            Self::Pro => PlanLimits {
                max_pipelines: 50,
                max_replicas_per_pipeline: 16,
                alerts_enabled: true,
                premium_connectors: true,
                multi_user: false,
            },
            Self::Enterprise => PlanLimits {
                max_pipelines: 250,
                max_replicas_per_pipeline: 64,
                alerts_enabled: true,
                premium_connectors: true,
                multi_user: true,
            },
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LicenseState {
    Active,
    Inactive,
    Expired,
}

impl LicenseState {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Expired => "expired",
        }
    }

    pub fn from_str(value: &str) -> Result<Self, IoTBeeError> {
        match value.to_ascii_lowercase().as_str() {
            "active" => Ok(Self::Active),
            "inactive" => Ok(Self::Inactive),
            "expired" => Ok(Self::Expired),
            _ => Err(LicenseError::InvalidState {
                state: value.to_string(),
            }
            .into()),
        }
    }
}

#[derive(Clone, Debug)]
pub struct PlanLimits {
    pub max_pipelines: u32,
    pub max_replicas_per_pipeline: u32,
    pub alerts_enabled: bool,
    pub premium_connectors: bool,
    pub multi_user: bool,
}

#[derive(Clone, Debug)]
pub struct LicenseSubscription {
    license_key: String,
    plan: LicensePlan,
    state: LicenseState,
    activated_at: DateTime<Utc>,
    expires_at: Option<DateTime<Utc>>,
    last_checked_at: DateTime<Utc>,
    stripe_customer_id: Option<String>,
    stripe_subscription_id: Option<String>,
    stripe_checkout_session_id: Option<String>,
    stripe_subscription_status: Option<String>,
    stripe_payment_status: Option<String>,
    current_period_end: Option<DateTime<Utc>>,
    cancel_at_period_end: bool,
    latest_invoice_id: Option<String>,
    amount_cents: Option<i64>,
    currency: Option<String>,
}

impl LicenseSubscription {
    pub fn new(
        license_key: impl Into<String>,
        plan: LicensePlan,
        state: LicenseState,
        activated_at: DateTime<Utc>,
        expires_at: Option<DateTime<Utc>>,
        last_checked_at: DateTime<Utc>,
    ) -> Self {
        Self {
            license_key: license_key.into(),
            plan,
            state,
            activated_at,
            expires_at,
            last_checked_at,
            stripe_customer_id: None,
            stripe_subscription_id: None,
            stripe_checkout_session_id: None,
            stripe_subscription_status: None,
            stripe_payment_status: None,
            current_period_end: None,
            cancel_at_period_end: false,
            latest_invoice_id: None,
            amount_cents: None,
            currency: None,
        }
    }

    #[allow(clippy::too_many_arguments)]
    pub fn with_stripe_billing(
        mut self,
        stripe_customer_id: Option<String>,
        stripe_subscription_id: Option<String>,
        stripe_checkout_session_id: Option<String>,
        stripe_subscription_status: Option<String>,
        stripe_payment_status: Option<String>,
        current_period_end: Option<DateTime<Utc>>,
        cancel_at_period_end: bool,
        latest_invoice_id: Option<String>,
        amount_cents: Option<i64>,
        currency: Option<String>,
    ) -> Self {
        self.stripe_customer_id = stripe_customer_id;
        self.stripe_subscription_id = stripe_subscription_id;
        self.stripe_checkout_session_id = stripe_checkout_session_id;
        self.stripe_subscription_status = stripe_subscription_status;
        self.stripe_payment_status = stripe_payment_status;
        self.current_period_end = current_period_end;
        self.cancel_at_period_end = cancel_at_period_end;
        self.latest_invoice_id = latest_invoice_id;
        self.amount_cents = amount_cents;
        self.currency = currency;
        self
    }

    pub fn license_key(&self) -> &str {
        &self.license_key
    }

    pub fn plan(&self) -> LicensePlan {
        self.plan
    }

    pub fn state(&self) -> LicenseState {
        self.state
    }

    pub fn activated_at(&self) -> DateTime<Utc> {
        self.activated_at
    }

    pub fn expires_at(&self) -> Option<DateTime<Utc>> {
        self.expires_at
    }

    pub fn last_checked_at(&self) -> DateTime<Utc> {
        self.last_checked_at
    }

    pub fn stripe_customer_id(&self) -> Option<&str> {
        self.stripe_customer_id.as_deref()
    }

    pub fn stripe_subscription_id(&self) -> Option<&str> {
        self.stripe_subscription_id.as_deref()
    }

    pub fn stripe_checkout_session_id(&self) -> Option<&str> {
        self.stripe_checkout_session_id.as_deref()
    }

    pub fn stripe_subscription_status(&self) -> Option<&str> {
        self.stripe_subscription_status.as_deref()
    }

    pub fn stripe_payment_status(&self) -> Option<&str> {
        self.stripe_payment_status.as_deref()
    }

    pub fn current_period_end(&self) -> Option<DateTime<Utc>> {
        self.current_period_end
    }

    pub fn cancel_at_period_end(&self) -> bool {
        self.cancel_at_period_end
    }

    pub fn latest_invoice_id(&self) -> Option<&str> {
        self.latest_invoice_id.as_deref()
    }

    pub fn amount_cents(&self) -> Option<i64> {
        self.amount_cents
    }

    pub fn currency(&self) -> Option<&str> {
        self.currency.as_deref()
    }

    pub fn is_active_at(&self, now: DateTime<Utc>) -> bool {
        if self.state != LicenseState::Active {
            return false;
        }
        self.expires_at.is_none_or(|expires_at| expires_at > now)
    }
}

pub struct StripeBillingSync {
    pub license_key: String,
    pub plan: LicensePlan,
    pub state: LicenseState,
    pub stripe_customer_id: Option<String>,
    pub stripe_subscription_id: Option<String>,
    pub stripe_checkout_session_id: Option<String>,
    pub stripe_subscription_status: Option<String>,
    pub stripe_payment_status: Option<String>,
    pub current_period_end: Option<DateTime<Utc>>,
    pub cancel_at_period_end: bool,
    pub latest_invoice_id: Option<String>,
    pub amount_cents: Option<i64>,
    pub currency: Option<String>,
    pub stripe_event_id: Option<String>,
    pub event_type: Option<String>,
    pub event_payload: Option<String>,
}
