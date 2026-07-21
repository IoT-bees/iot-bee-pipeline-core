use chrono::{DateTime, Utc};

#[derive(Debug, Clone)]
pub struct Dependency {
    pub name: String,
    pub configured: bool,
    pub ok: bool,
    pub latency_ms: Option<u64>,
    pub error: Option<String>,
}

#[derive(Debug, Clone)]
pub struct RuntimeSummary {
    pub configured_pipelines: i64,
    pub live_replicas: Option<i64>,
    pub msgs_last_hour: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct BuildInfo {
    pub commit: String,
    pub build_time: String,
    pub uptime_seconds: u64,
}

#[derive(Debug, Clone)]
pub struct SystemStatus {
    pub probed_at: DateTime<Utc>,
    pub dependencies: Vec<Dependency>,
    pub runtime: RuntimeSummary,
    pub build: BuildInfo,
}
