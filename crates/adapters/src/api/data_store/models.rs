use super::config::DataStoreConfig;
use chrono::{DateTime, Utc};
use domain::entities::data_store::{PipelineDataStoreInputModel, PipelineDataStoreOutputModel};
use domain::error::{DomainValidationError, IoTBeeError};
use domain::value_objects::data_store_values::PipelineDataStoreModel;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

pub type DataStoreId = u32;

#[derive(Deserialize, Validate, ToSchema)]
pub struct CreateDataStoreRequest {
    #[serde(rename = "name")]
    #[validate(length(min = 1, max = 30))]
    pub name: String,
    #[serde(rename = "dataStoreConfiguration")]
    #[validate(nested)]
    pub data_store_configuration: DataStoreConfig,
    #[serde(rename = "dataStoreDescription")]
    #[validate(length(min = 1, max = 255))]
    pub data_store_description: String,
}

impl TryFrom<CreateDataStoreRequest> for PipelineDataStoreInputModel {
    type Error = IoTBeeError;

    fn try_from(request: CreateDataStoreRequest) -> Result<Self, Self::Error> {
        let config = PipelineDataStoreModel::try_from(request.data_store_configuration)?;
        PipelineDataStoreInputModel::new(request.name, config, request.data_store_description)
    }
}

#[derive(Serialize, ToSchema)]
pub struct DataStoreResponse {
    #[serde(rename = "id")]
    pub id: u32,
    #[serde(rename = "name")]
    pub name: String,
    #[serde(rename = "storeType")]
    pub store_type: String,
    #[serde(rename = "dataStoreConfiguration")]
    pub data_store_configuration: String,
    #[serde(rename = "dataStoreDescription")]
    pub data_store_description: String,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

impl TryFrom<PipelineDataStoreOutputModel> for DataStoreResponse {
    type Error = IoTBeeError;

    fn try_from(output_model: PipelineDataStoreOutputModel) -> Result<Self, Self::Error> {
        let config_json = serde_json::to_string(output_model.configuration())
            .map_err(|e| DomainValidationError::DataFormatError {
                reason: format!("Failed to serialize data store configuration: {}", e),
            })?;
        Ok(DataStoreResponse {
            id: output_model.id(),
            name: output_model.name().to_string(),
            store_type: output_model.store_type_string(),
            data_store_configuration: config_json,
            data_store_description: output_model.data_store_description().to_string(),
            created_at: output_model.created_at(),
            updated_at: output_model.updated_at(),
        })
    }
}
