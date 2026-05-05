use serde::{Deserialize, Serialize};

use domain::entities::validation_schema::{
    PipelineNewValidateSchema, PipelineValidationSchemaModel,
};

use domain::error::PipelinePersistenceError;
// use domain::pipeline_schema::schemas::PipelineSchemaMap;
use domain::ast::schemas::FieldSchema;
use chrono::{DateTime, Utc};
use utoipa::ToSchema;
use validator::Validate;
use std::collections::HashMap;

pub type SchemaId = u32;


#[derive(Deserialize, Validate, ToSchema)]
#[schema(example = json!({
    "name": "sensor_ambiental",
    "schema": {
        "temperatura": {"type": "float", "required": true, "default": null, "validation": {"min": -50.0, "max": 150.0}, "operation": null}
    }
}))]
pub struct CreateValidationSchemaRequest {
    #[serde(rename = "name")]
    #[validate(length(min = 1, max = 32))]
    pub name: String,

    #[serde(rename = "schema")]
    #[schema(
        value_type = Object,
        example = json!({
            "temperatura": {
                "type": "float",
                "required": true,
                "default": null,
                "validation": { "min": -50.0, "max": 150.0 },
                "operation": null
            },
            "humedad": {
                "type": "float",
                "required": true,
                "default": null,
                "validation": { "min": 0.0, "max": 100.0 },
                "operation": null
            }
        })
    )]
    pub json_schema: HashMap<String, FieldSchema>,
}

impl CreateValidationSchemaRequest {
    pub fn validate_values(&self) -> Result<(), PipelinePersistenceError> {
        self.validate()
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: e.to_string(),
            })?;
        Ok(())
    }

    pub fn json_schema_str(&self) -> Result<String, PipelinePersistenceError> {
        serde_json::to_string(&self.json_schema)
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: e.to_string(),
            })
    }
}

//=====================


#[derive(Deserialize, Validate, ToSchema)]
pub struct UpdateValidationSchemaRequestName {
    #[serde(rename = "name")]
    #[validate(length(min = 1, max = 32))]
    pub name: String,
}

#[derive(Deserialize, Validate, ToSchema)]
pub struct UpdateValidationSchemaRequestJson {
    #[serde(rename = "schema")]
    #[schema(
        value_type = Object,
        example = json!({
            "temperatura": {
                "type": "float",
                "required": true,
                "default": null,
                "validation": { "min": -50.0, "max": 150.0 },
                "operation": null
            }
        })
    )]
    pub json_schema: HashMap<String, FieldSchema>,
}

impl UpdateValidationSchemaRequestJson {
    pub fn validate_values(&self) -> Result<(), PipelinePersistenceError> {
        self.validate()
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: e.to_string(),
            })?;
        Ok(())
    }

    pub fn json_schema(&self) -> String {
        serde_json::to_string(&self.json_schema)
            .expect("serialización de HashMap<String, FieldSchema> válido nunca falla")
    }
}

#[derive(Serialize, ToSchema)]
pub struct ValidationSchemaResponse {
    pub id: u32,
    pub name: String,
    #[serde(rename = "schema")]
    pub json_schema: String,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}
impl From<PipelineValidationSchemaModel> for ValidationSchemaResponse {
    fn from(model: PipelineValidationSchemaModel) -> Self {
        ValidationSchemaResponse {
            id: model.id(),
            name: model.name().into(),
            json_schema: model.schema().into(),
            created_at: model.created_at().clone(),
            updated_at: model.updated_at().clone(),
        }
    }
}

#[derive(Serialize, ToSchema)]
pub struct ValidationSchemaByIdResponse {
    pub name: String,
    #[serde(rename = "schema")]
    pub json_schema: String,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}
impl From<PipelineNewValidateSchema> for ValidationSchemaByIdResponse {
    fn from(model: PipelineNewValidateSchema) -> Self {
        ValidationSchemaByIdResponse {
            name: model.name().into(),
            json_schema: model.schema().into(),
            created_at: model.created_at().clone(),
            updated_at: model.updated_at().clone(),
        }
    }
}
