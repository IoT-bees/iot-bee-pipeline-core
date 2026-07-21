use crate::error::IoTBeeError;
use crate::value_objects::pipelines_values::{DataStoreId, DescriptionField, FieldName};

use chrono::{DateTime, Utc};

pub struct PipelineGroupInputModel {
    name: FieldName,
    description: DescriptionField,
}
impl PipelineGroupInputModel {
    pub fn new(
        name: impl Into<String>,
        description: impl Into<String>,
    ) -> Result<Self, IoTBeeError> {
        Ok(Self {
            name: FieldName::new(name)?,
            description: DescriptionField::new(description)?,
        })
    }

    pub fn name(&self) -> &str {
        self.name.name()
    }
    pub fn description(&self) -> &str {
        self.description.description()
    }
}

pub struct PipelineGroupOutputModel {
    id: DataStoreId,
    name: FieldName,
    description: DescriptionField,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
impl PipelineGroupOutputModel {
    pub fn new(
        id: u32,
        name: impl Into<String>,
        description: impl Into<String>,
        created_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> Result<Self, IoTBeeError> {
        Ok(Self {
            id: DataStoreId::new(id)?,
            name: FieldName::new(name)?,
            description: DescriptionField::new(description)?,
            created_at,
            updated_at,
        })
    }

    pub fn id(&self) -> u32 {
        self.id.id()
    }
    pub fn name(&self) -> &str {
        self.name.name()
    }
    pub fn description(&self) -> &str {
        self.description.description()
    }
    pub fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }
    pub fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }
}
