use super::config::DataSourceConfig;
use domain::entities::data_source::{
    PipelineDataSourceInputModel, PipelineDataSourceOutputModel, PipelineDataSourceUpdateModel,
};
use domain::error::{DomainValidationError, IoTBeeError};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

pub type DataSourceId = u32;

#[derive(Deserialize, Validate, ToSchema)]
pub struct CreateDataSourceRequest {
    #[serde(rename = "name")]
    #[validate(length(min = 1, max = 30))]
    pub name: String,
    #[serde(rename = "dataSourceTypeId")]
    #[validate(range(min = 1))]
    pub data_source_type_id: u32,
    #[serde(rename = "dataSourceState")]
    #[validate(length(min = 1))]
    pub data_source_state: String,
    #[serde(rename = "dataSourceConfiguration")]
    pub data_source_configuration: DataSourceConfig,
    #[serde(rename = "dataSourceDescription")]
    #[validate(length(min = 1, max = 255))]
    pub data_source_description: String,
}

impl TryFrom<CreateDataSourceRequest> for PipelineDataSourceInputModel {
    type Error = IoTBeeError;

    fn try_from(request: CreateDataSourceRequest) -> Result<Self, Self::Error> {
        let source_type = request.data_source_configuration.source_type_name().to_string();
        let config_json = serde_json::to_string(&request.data_source_configuration)
            .map_err(|e| DomainValidationError::DataFormatError {
                reason: format!("Failed to serialize data source configuration: {}", e),
            })?;
        Ok(PipelineDataSourceInputModel::new(
            request.name,
            request.data_source_type_id,
            config_json,
            source_type,
            request.data_source_description,
        )?)
    }
}

#[derive(Serialize, ToSchema)]
pub struct DataSourceResponse {
    #[serde(rename = "id")]
    pub id: u32,
    #[serde(rename = "name")]
    pub name: String,
    #[serde(rename = "dataSourceTypeId")]
    pub data_source_type_id: u32,
    #[serde(rename = "dataSourceState")]
    pub data_source_state: String,
    #[serde(rename = "dataSourceConfiguration")]
    pub data_source_configuration: String,
    #[serde(rename = "sourceType")]
    pub source_type: String,
    #[serde(rename = "dataSourceDescription")]
    pub data_source_description: String,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

impl TryFrom<PipelineDataSourceOutputModel> for DataSourceResponse {
    type Error = IoTBeeError;

    fn try_from(output_model: PipelineDataSourceOutputModel) -> Result<Self, Self::Error> {
        Ok(DataSourceResponse {
            id: output_model.id(),
            name: output_model.name().to_string(),
            data_source_type_id: output_model.data_source_type_id(),
            data_source_state: output_model.data_source_state().to_string(),
            data_source_configuration: output_model.data_source_configuration().to_string(),
            source_type: output_model.source_type().to_string(),
            data_source_description: output_model.description().to_string(),
            created_at: output_model.created_at(),
            updated_at: output_model.updated_at(),
        })
    }
}

#[derive(Deserialize, Validate, ToSchema)]
pub struct UpdateDataSourceRequest {
    #[serde(rename = "dataSourceTypeId")]
    pub data_source_type_id: Option<u32>,
    #[serde(rename = "dataSourceState")]
    pub data_source_state: Option<String>,
    #[serde(rename = "dataSourceConfiguration")]
    pub data_source_configuration: Option<DataSourceConfig>,
    #[serde(rename = "dataSourceDescription")]
    pub data_source_description: Option<String>,
}
impl TryFrom<UpdateDataSourceRequest> for PipelineDataSourceUpdateModel {
    type Error = IoTBeeError;

    fn try_from(request: UpdateDataSourceRequest) -> Result<Self, Self::Error> {
        let (config_json, source_type) = match request.data_source_configuration {
            Some(config) => {
                let source_type = config.source_type_name().to_string();
                let json = serde_json::to_string(&config).map_err(|e| {
                    DomainValidationError::DataFormatError {
                        reason: format!("Failed to serialize data source configuration: {}", e),
                    }
                })?;
                (Some(json), Some(source_type))
            }
            None => (None, None),
        };
        PipelineDataSourceUpdateModel::new(
            request.data_source_type_id,
            request.data_source_state,
            config_json,
            source_type,
            request.data_source_description,
        )
    }
}

#[derive(Deserialize, Validate, ToSchema)]
pub struct UpdateDataSourceNameRequest {
    #[serde(rename = "name")]
    #[validate(length(min = 1, max = 30))]
    pub name: String,
}
