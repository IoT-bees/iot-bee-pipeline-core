use domain::entities::pipeline_groups::{PipelineGroupInputModel, PipelineGroupOutputModel};
use domain::error::IoTBeeError;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

pub type GroupId = u32;

#[derive(Deserialize, Validate, ToSchema)]
pub struct CreateGroupRequest {
    #[serde(rename = "name")]
    #[validate(length(min = 1, max = 30))]
    pub name: String,
    #[serde(rename = "description")]
    #[validate(length(min = 1, max = 255))]
    pub description: String,
}
impl TryFrom<CreateGroupRequest> for PipelineGroupInputModel {
    type Error = IoTBeeError;

    fn try_from(request: CreateGroupRequest) -> Result<Self, Self::Error> {
        PipelineGroupInputModel::new(request.name, request.description)
    }
}

#[derive(Serialize, ToSchema)]
pub struct GroupResponse {
    #[serde(rename = "id")]
    pub id: u32,
    #[serde(rename = "name")]
    pub name: String,
    #[serde(rename = "description")]
    pub description: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}
impl TryFrom<PipelineGroupOutputModel> for GroupResponse {
    type Error = IoTBeeError;

    fn try_from(output_model: PipelineGroupOutputModel) -> Result<Self, Self::Error> {
        Ok(GroupResponse {
            id: output_model.id(),
            name: output_model.name().to_string(),
            description: output_model.description().to_string(),
            created_at: output_model.created_at().to_rfc3339(),
            updated_at: output_model.updated_at().to_rfc3339(),
        })
    }
}
