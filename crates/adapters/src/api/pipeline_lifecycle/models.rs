use domain::value_objects::lifecycle_values::{PipelineStatusReport};
use serde::{Serialize};
// use validator::Validate;
use utoipa::ToSchema;
use std::collections::HashMap;



pub type PipelineId = u32;


#[derive(Serialize, ToSchema)]
pub struct PipelineStatusResponse{
    pub pipeline_general_status: String,
    pub replica_statuses: HashMap<u32, String>
}


impl TryFrom<PipelineStatusReport> for PipelineStatusResponse {
    type Error = String;

    fn try_from(report: PipelineStatusReport) -> Result<Self, Self::Error> {
        Ok(PipelineStatusResponse {
            pipeline_general_status: report.overall_string_status(),
            replica_statuses: report.pipeline_health_by_reply_string(),
        })
    }
}