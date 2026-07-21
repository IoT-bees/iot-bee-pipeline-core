use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct CreatePlanRequest {
    pub slug: String,
    #[serde(rename = "organizationId", default)]
    pub organization_id: Option<i64>,
    #[serde(rename = "displayName")]
    pub display_name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(rename = "priceCents")]
    pub price_cents: i64,
    pub currency: String,
    #[serde(rename = "maxPipelines")]
    pub max_pipelines: i64,
    #[serde(rename = "maxReplicasPerPipeline")]
    pub max_replicas_per_pipeline: i64,
    #[serde(rename = "includedMessagesMonthly")]
    pub included_messages_monthly: i64,
    #[serde(rename = "alertsEnabled", default)]
    pub alerts_enabled: bool,
    #[serde(rename = "premiumConnectors", default)]
    pub premium_connectors: bool,
    #[serde(rename = "multiUser", default)]
    pub multi_user: bool,
    #[serde(rename = "isCustom", default)]
    pub is_custom: bool,
    #[serde(rename = "stripePriceId", default)]
    pub stripe_price_id: Option<String>,
}

#[derive(Deserialize, ToSchema, Default)]
pub struct PatchPlanRequest {
    #[serde(rename = "displayName", default)]
    pub display_name: Option<String>,
    #[serde(default)]
    pub description: Option<Option<String>>,
    #[serde(rename = "priceCents", default)]
    pub price_cents: Option<i64>,
    #[serde(default)]
    pub currency: Option<String>,
    #[serde(rename = "maxPipelines", default)]
    pub max_pipelines: Option<i64>,
    #[serde(rename = "maxReplicasPerPipeline", default)]
    pub max_replicas_per_pipeline: Option<i64>,
    #[serde(rename = "includedMessagesMonthly", default)]
    pub included_messages_monthly: Option<i64>,
    #[serde(rename = "alertsEnabled", default)]
    pub alerts_enabled: Option<bool>,
    #[serde(rename = "premiumConnectors", default)]
    pub premium_connectors: Option<bool>,
    #[serde(rename = "multiUser", default)]
    pub multi_user: Option<bool>,
    #[serde(rename = "stripePriceId", default)]
    pub stripe_price_id: Option<Option<String>>,
}

#[derive(Serialize, ToSchema)]
pub struct PlanResponse {
    pub id: i64,
    pub slug: String,
    #[serde(rename = "organizationId")]
    pub organization_id: Option<i64>,
    #[serde(rename = "displayName")]
    pub display_name: String,
    pub description: Option<String>,
    #[serde(rename = "priceCents")]
    pub price_cents: i64,
    pub currency: String,
    #[serde(rename = "maxPipelines")]
    pub max_pipelines: i64,
    #[serde(rename = "maxReplicasPerPipeline")]
    pub max_replicas_per_pipeline: i64,
    #[serde(rename = "includedMessagesMonthly")]
    pub included_messages_monthly: i64,
    #[serde(rename = "alertsEnabled")]
    pub alerts_enabled: bool,
    #[serde(rename = "premiumConnectors")]
    pub premium_connectors: bool,
    #[serde(rename = "multiUser")]
    pub multi_user: bool,
    #[serde(rename = "isCustom")]
    pub is_custom: bool,
    #[serde(rename = "stripePriceId")]
    pub stripe_price_id: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Serialize, ToSchema)]
pub struct PlanListResponse {
    pub items: Vec<PlanResponse>,
}
