use domain::value_objects::lifecycle_values::PipelineStatusReport;
use serde::Serialize;
// use validator::Validate;
use std::collections::HashMap;
use utoipa::ToSchema;

pub type PipelineId = u32;

#[derive(Serialize, ToSchema)]
pub struct ReplicaStatusResponse {
    pub replica_id: u32,
    pub status: String,
    pub last_processed_at: Option<String>,
    pub last_error: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct PipelineStatusResponse {
    pub pipeline_id: u32,
    pub pipeline_name: String,
    pub pipeline_general_status: String,
    pub replica_statuses: HashMap<u32, String>,
    pub replicas: Vec<ReplicaStatusResponse>,
}

impl TryFrom<PipelineStatusReport> for PipelineStatusResponse {
    type Error = String;

    fn try_from(report: PipelineStatusReport) -> Result<Self, Self::Error> {
        let mut replicas: Vec<ReplicaStatusResponse> = report
            .replicas()
            .iter()
            .map(|(id, parts)| ReplicaStatusResponse {
                replica_id: *id,
                status: format!("{:?}", parts.overall_status()),
                last_processed_at: parts.last_processed_at().map(|t| t.to_rfc3339()),
                last_error: parts.last_error().map(|s| s.to_string()),
            })
            .collect();
        replicas.sort_by_key(|r| r.replica_id);

        Ok(PipelineStatusResponse {
            pipeline_id: report.pipeline_id(),
            pipeline_name: report.pipeline_name().to_string(),
            pipeline_general_status: report.overall_string_status(),
            replica_statuses: report.pipeline_health_by_reply_string(),
            replicas,
        })
    }
}
