use chrono::{DateTime, Utc};
use domain::entities::pipeline_data::{PipelineDataInputModel, PipelineDataOutputModel};
use domain::error::{IoTBeeError, PipelinePersistenceError};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

pub type PipelineDataId = u32;

#[derive(Deserialize, Validate, ToSchema)]
pub struct CreatePipelineDataRequest {
    #[serde(rename = "name")]
    #[validate(length(min = 1, max = 30))]
    pub name: String,
    #[serde(rename = "dataStoreId")]
    #[validate(range(min = 1))]
    pub data_store_id: u32,
    #[serde(rename = "pipelineGroupId")]
    #[validate(range(min = 1))]
    pub pipeline_group_id: u32,
    #[serde(rename = "dataSourceId")]
    #[validate(range(min = 1))]
    pub data_source_id: u32,
    #[serde(rename = "validationSchemaId")]
    #[validate(range(min = 1))]
    pub validation_schema_id: u32,
    #[serde(rename = "dataStoreDescription")]
    #[validate(length(min = 1, max = 255))]
    pub data_store_description: String,
    #[serde(rename = "pipelineReplication")]
    #[validate(range(min = 1))]
    pub pipeline_replication: u32,
    // Si no se envía, el pipeline se crea como inactivo por defecto.
    // #[serde(rename = "isActive", default)]
    // pub is_active: bool,
}

impl TryFrom<CreatePipelineDataRequest> for PipelineDataInputModel {
    type Error = IoTBeeError;

    fn try_from(request: CreatePipelineDataRequest) -> Result<Self, Self::Error> {
        request
            .validate()
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: e.to_string(),
            })?;

        Ok(PipelineDataInputModel::new(
            request.name,
            request.pipeline_group_id,
            request.data_store_id,
            request.data_source_id,
            request.validation_schema_id,
            request.pipeline_replication,
            false,
        )?)
    }
}

#[derive(Serialize, ToSchema, Validate)]
pub struct GroupInfo {
    id: u32,
    name: String,
}
#[derive(Serialize, ToSchema, Validate)]
pub struct DataStoreInfo {
    id: u32,
    name: String,
}

#[derive(Serialize, ToSchema, Validate)]
pub struct DataSourceInfo {
    id: u32,
    name: String,
}
#[derive(Serialize, ToSchema, Validate)]
pub struct DataValidationSchemaInfo {
    id: u32,
    name: String,
}

#[derive(Serialize, ToSchema, Validate)]
pub struct PipelineDataResponse {
    #[serde(rename = "id")]
    pub id: u32,
    #[serde(rename = "name")]
    pub name: String,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[serde(rename = "dataStore")]
    pub data_store: DataStoreInfo,
    #[serde(rename = "pipelineGroup")]
    pub pipeline_group: GroupInfo,
    #[serde(rename = "dataSource")]
    pub data_source: DataSourceInfo,
    #[serde(rename = "dataValidationSchema")]
    pub data_validation_schema: DataValidationSchemaInfo,
    #[serde(rename = "replicationFactor")]
    pub replication_factor: u32,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

impl TryFrom<PipelineDataOutputModel> for PipelineDataResponse {
    type Error = IoTBeeError;

    fn try_from(output_model: PipelineDataOutputModel) -> Result<Self, Self::Error> {
        let response = Self {
            id: output_model.id().id(),
            name: output_model.name().to_string(),
            is_active: output_model.is_active(),
            data_store: DataStoreInfo {
                id: output_model.store_id(),
                name: output_model.store_name().to_string(),
            },
            pipeline_group: GroupInfo {
                id: output_model.group_id(),
                name: output_model.group_name().to_string(),
            },
            data_source: DataSourceInfo {
                id: output_model.data_source_id(),
                name: output_model.data_source_name().to_string(),
            },
            data_validation_schema: DataValidationSchemaInfo {
                id: output_model.validation_schema_id(),
                name: output_model.validation_schema_name().to_string(),
            },
            replication_factor: output_model.pipeline_replication(),
            created_at: output_model.created_at(),
            updated_at: output_model.updated_at(),
        };
        Ok(response)
    }
}
