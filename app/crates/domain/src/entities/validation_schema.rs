use crate::error::IoTBeeError;
use crate::value_objects::pipelines_values::{DataStoreId, FieldName, PipelineSchemaModel};
use chrono::{DateTime, Utc};

/// Modelo de salida para un esquema de validación existente en la base de datos.
pub struct PipelineValidationSchemaModel {
    id: DataStoreId,
    name: FieldName,
    schema: PipelineSchemaModel,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl PipelineValidationSchemaModel {
    pub fn new(
        id: u32,
        name: impl Into<String>,
        schema: impl Into<String>,
        created_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> Result<Self, IoTBeeError> {
        Ok(Self {
            id: DataStoreId::new(id)?,
            name: FieldName::new(name)?,
            schema: PipelineSchemaModel::new(schema)?,
            created_at,
            updated_at,
        })
    }

    pub fn id(&self) -> u32 {
        self.id.id()
    }

    pub fn name(&self) -> &str {
        &self.name.name()
    }

    pub fn schema(&self) -> &str {
        &self.schema.schema()
    }

    pub fn created_at(&self) -> &DateTime<Utc> {
        &self.created_at
    }

    pub fn updated_at(&self) -> &DateTime<Utc> {
        &self.updated_at
    }
}

/// Modelo de entrada para crear o reconstruir un esquema de validación.
pub struct PipelineNewValidateSchema {
    pub name: FieldName,
    pub schema: PipelineSchemaModel,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl PipelineNewValidateSchema {
    pub fn existing(
        name: impl Into<String>,
        schema: impl Into<String>,
        created_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> Result<Self, IoTBeeError> {
        let schema = PipelineSchemaModel::new(schema.into())?;

        Ok(PipelineNewValidateSchema {
            name: FieldName::new(name.into())?,
            schema,
            created_at,
            updated_at,
        })
    }

    pub fn new(name: impl Into<String>, schema: impl Into<String>) -> Result<Self, IoTBeeError> {
        let now = Utc::now();
        let schema = PipelineSchemaModel::new(schema.into())?;
        Ok(PipelineNewValidateSchema {
            name: FieldName::new(name.into())?,
            schema,
            created_at: now,
            updated_at: now,
        })
    }

    pub fn name(&self) -> &str {
        &self.name.name()
    }
    pub fn schema(&self) -> &str {
        &self.schema.schema()
    }
    pub fn created_at(&self) -> &DateTime<Utc> {
        &self.created_at
    }
    pub fn updated_at(&self) -> &DateTime<Utc> {
        &self.updated_at
    }
}
