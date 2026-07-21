use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct UpdateContactSettingsRequest {
    #[serde(rename = "contactEmail")]
    pub contact_email: String,
    #[serde(rename = "whatsappNumber")]
    pub whatsapp_number: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct ContactSettingsResponse {
    #[serde(rename = "contactEmail")]
    pub contact_email: String,
    #[serde(rename = "whatsappNumber")]
    pub whatsapp_number: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct DependencyResponse {
    pub name: String,
    pub configured: bool,
    pub ok: bool,
    #[serde(rename = "latencyMs")]
    pub latency_ms: Option<u64>,
    pub error: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct RuntimeResponse {
    #[serde(rename = "configuredPipelines")]
    pub configured_pipelines: i64,
    #[serde(rename = "liveReplicas")]
    pub live_replicas: Option<i64>,
    #[serde(rename = "msgsLastHour")]
    pub msgs_last_hour: Option<i64>,
}

#[derive(Serialize, ToSchema)]
pub struct BuildResponse {
    pub commit: String,
    #[serde(rename = "buildTime")]
    pub build_time: String,
    #[serde(rename = "uptimeSeconds")]
    pub uptime_seconds: u64,
}

#[derive(Serialize, ToSchema)]
pub struct SystemStatusResponse {
    #[serde(rename = "probedAt")]
    pub probed_at: String,
    pub dependencies: Vec<DependencyResponse>,
    pub runtime: RuntimeResponse,
    pub build: BuildResponse,
}
