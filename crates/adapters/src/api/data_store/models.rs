use chrono::{DateTime, Utc};
use domain::entities::data_store::{PipelineDataStoreInputModel, PipelineDataStoreOutputModel};
use domain::error::{IoTBeeError, PipelinePersistenceError};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

pub type DataStoreId = u32;

#[derive(Deserialize, Validate, ToSchema)]
pub struct CreateDataStoreRequest {
    #[serde(rename = "name")]
    #[validate(length(min = 1, max = 30))]
    pub name: String,
    #[serde(rename = "dataStoreTypeId")]
    #[validate(range(min = 1))]
    pub data_store_type_id: u32,
    #[serde(rename = "dataStoreConfiguration")]
    #[validate(length(min = 1))]
    pub data_store_configuration: String,
    #[serde(rename = "dataStoreDescription")]
    #[validate(length(min = 1, max = 255))]
    pub data_store_description: String,
}

impl TryFrom<CreateDataStoreRequest> for PipelineDataStoreInputModel {
    type Error = IoTBeeError;

    fn try_from(request: CreateDataStoreRequest) -> Result<Self, Self::Error> {
        request
            .validate()
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: e.to_string(),
            })?;

        Ok(PipelineDataStoreInputModel::new(
            request.name,
            request.data_store_type_id,
            request.data_store_configuration,
            request.data_store_description,
        )?)
    }
}

#[derive(Serialize, ToSchema, Validate)]
pub struct DataStoreResponse {
    #[serde(rename = "id")]
    pub id: u32,
    #[serde(rename = "name")]
    pub name: String,
    #[serde(rename = "dataStoreTypeId")]
    pub data_store_type_id: u32,
    #[serde(rename = "dataStoreConfiguration")]
    pub data_store_configuration: String,
    #[serde(rename = "dataStoreJsonSchema")]
    pub data_store_json_schema: String,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

impl TryFrom<PipelineDataStoreOutputModel> for DataStoreResponse {
    type Error = IoTBeeError;

    fn try_from(output_model: PipelineDataStoreOutputModel) -> Result<Self, Self::Error> {
        let data_store_response = Self {
            id: output_model.id(),
            name: output_model.name().to_string(),
            data_store_type_id: output_model.type_id(),
            data_store_configuration: output_model.configuration().to_string(),
            data_store_json_schema: output_model.data_store_description().to_string(),
            created_at: output_model.created_at(),
            updated_at: output_model.updated_at(),
        };

        data_store_response
            .validate()
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: e.to_string(),
            })?;

        Ok(data_store_response)
    }
}
