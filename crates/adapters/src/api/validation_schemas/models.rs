use serde::{Deserialize, Serialize};

use domain::entities::validation_schema::{
    PipelineNewValidateSchema, PipelineValidationSchemaModel,
};
use domain::error::PipelinePersistenceError;
use domain::ast::schemas::FieldSchema;
use chrono::{DateTime, Utc};
use utoipa::ToSchema;
use validator::Validate;
use std::collections::HashMap;

pub type SchemaId = u32;


/// Request body to create a new validation schema. The `schema` object defines the expected fields,
/// their types, constraints and optional transformation expressions.
#[derive(Deserialize, Validate, ToSchema)]
#[schema(
    example = json!({
        "name": "environmental_station",
        "schema": {
            "temperature": {
                "type": "float",
                "required": true,
                "default": null,
                "validation": { "min": -40.0, "max": 85.0 },
                "operation": null
            },
            "humidity": {
                "type": "float",
                "required": true,
                "default": null,
                "validation": { "min": 0.0, "max": 100.0 },
                "operation": null
            },
            "pressure": {
                "type": "float",
                "required": false,
                "default": 1013.25,
                "validation": { "min": 300.0, "max": 1100.0 },
                "operation": null
            }
        }
    })
)]
pub struct CreateValidationSchemaRequest {
    #[serde(rename = "name")]
    #[validate(length(min = 1, max = 32))]
    pub name: String,

    /// Map of field name → FieldSchema. Each key is the field name expected in incoming messages.
    /// Supported types: `float`, `int`, `bool`.
    /// The `operation` field accepts an arithmetic expression tree (`num`, `var`, `bin_op`) or `null`.
    #[serde(rename = "schema")]
    #[schema(
        value_type = Object,
        example = json!({
            "temperature": {
                "type": "float",
                "required": true,
                "default": null,
                "validation": { "min": -40.0, "max": 85.0 },
                "operation": null
            },
            "humidity": {
                "type": "float",
                "required": true,
                "default": null,
                "validation": { "min": 0.0, "max": 100.0 },
                "operation": null
            },
            "pressure": {
                "type": "float",
                "required": false,
                "default": 1013.25,
                "validation": { "min": 300.0, "max": 1100.0 },
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


/// Request body to update a schema's name.
/// The new name must be unique across all schemas (1–32 characters).
#[derive(Deserialize, Validate, ToSchema)]
#[schema(example = json!({ "name": "environmental_station_v2" }))]
pub struct UpdateValidationSchemaRequestName {
    /// New unique name for the schema. 1–32 characters.
    #[serde(rename = "name")]
    #[validate(length(min = 1, max = 32))]
    #[schema(example = "environmental_station_v2")]
    pub name: String,
}

/// Request body to fully replace the fields of an existing validation schema. All previous fields are discarded.
#[derive(Deserialize, Validate, ToSchema)]
pub struct UpdateValidationSchemaRequestJson {
    /// New map of field name → FieldSchema. Replaces the entire previous schema.
    #[serde(rename = "schema")]
    #[schema(
        value_type = Object,
        example = json!({
            "temperature": {
                "type": "float",
                "required": true,
                "default": null,
                "validation": { "min": -40.0, "max": 85.0 },
                "operation": null
            },
            "active": {
                "type": "bool",
                "required": true,
                "default": null,
                "validation": null,
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

/// Validation schema list item returned by `GET /validation-schemas`.
/// The `schema` field is a **serialized JSON string** of the field map, not an object.
#[derive(Serialize, ToSchema)]
#[schema(
    example = json!({
        "id": 1,
        "name": "environmental_station",
        "schema": "{\"temperature\":{\"type\":\"float\",\"required\":true,\"default\":null,\"validation\":{\"min\":-40.0,\"max\":85.0},\"operation\":null},\"humidity\":{\"type\":\"float\",\"required\":true,\"default\":null,\"validation\":{\"min\":0.0,\"max\":100.0},\"operation\":null}}",
        "createdAt": "2026-05-06T15:00:00Z",
        "updatedAt": "2026-05-06T15:00:00Z"
    })
)]
pub struct ValidationSchemaResponse {
    /// Unique schema ID.
    #[schema(example = 1)]
    pub id: u32,
    /// Unique schema name.
    #[schema(example = "environmental_station")]
    pub name: String,
    /// Serialized JSON string of the FieldSchema map.
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

/// Full validation schema detail returned by `GET /validation-schemas/{id}`.
/// The `schema` field is a **serialized JSON string** of the field map, not an object.
#[derive(Serialize, ToSchema)]
#[schema(
    example = json!({
        "name": "environmental_station",
        "schema": "{\"temperature\":{\"type\":\"float\",\"required\":true,\"default\":null,\"validation\":{\"min\":-40.0,\"max\":85.0},\"operation\":null},\"humidity\":{\"type\":\"float\",\"required\":true,\"default\":null,\"validation\":{\"min\":0.0,\"max\":100.0},\"operation\":null}}",
        "createdAt": "2026-05-06T15:00:00Z",
        "updatedAt": "2026-05-06T15:00:00Z"
    })
)]
pub struct ValidationSchemaByIdResponse {
    /// Unique schema name.
    #[schema(example = "environmental_station")]
    pub name: String,
    /// Serialized JSON string of the FieldSchema map.
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
