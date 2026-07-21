use chrono::{DateTime, Utc};

use crate::entities::license::PlanLimits;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Plan {
    pub id: i64,
    pub slug: String,
    /// `None` = global plan visible to every organization.
    /// `Some(id)` = custom plan applying only to that organization.
    pub organization_id: Option<i64>,
    pub display_name: String,
    pub description: Option<String>,
    pub price_cents: i64,
    pub currency: String,
    pub max_pipelines: i64,
    pub max_replicas_per_pipeline: i64,
    pub included_messages_monthly: i64,
    pub alerts_enabled: bool,
    pub premium_connectors: bool,
    pub multi_user: bool,
    pub is_custom: bool,
    pub stripe_price_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Plan {
    pub fn to_limits(&self) -> PlanLimits {
        PlanLimits {
            max_pipelines: self.max_pipelines.max(0) as u32,
            max_replicas_per_pipeline: self.max_replicas_per_pipeline.max(0) as u32,
            included_messages_monthly: self.included_messages_monthly.max(0) as u64,
            alerts_enabled: self.alerts_enabled,
            premium_connectors: self.premium_connectors,
            multi_user: self.multi_user,
        }
    }
}

#[derive(Debug, Clone)]
pub struct NewPlan {
    pub slug: String,
    pub organization_id: Option<i64>,
    pub display_name: String,
    pub description: Option<String>,
    pub price_cents: i64,
    pub currency: String,
    pub max_pipelines: i64,
    pub max_replicas_per_pipeline: i64,
    pub included_messages_monthly: i64,
    pub alerts_enabled: bool,
    pub premium_connectors: bool,
    pub multi_user: bool,
    pub is_custom: bool,
    pub stripe_price_id: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct UpdatePlan {
    pub display_name: Option<String>,
    pub description: Option<Option<String>>,
    pub price_cents: Option<i64>,
    pub currency: Option<String>,
    pub max_pipelines: Option<i64>,
    pub max_replicas_per_pipeline: Option<i64>,
    pub included_messages_monthly: Option<i64>,
    pub alerts_enabled: Option<bool>,
    pub premium_connectors: Option<bool>,
    pub multi_user: Option<bool>,
    pub stripe_price_id: Option<Option<String>>,
}
