use crate::error::IoTBeeError;
use crate::value_objects::pipelines_values::{
    DataStoreId, DescriptionField, FieldName, PipelineDataStoreModel,
};
use chrono::{DateTime, Utc};

pub struct PipelineDataStoreInputModel {
    name: FieldName,
    type_id: DataStoreId,
    data_store_description: DescriptionField,
    configuration: PipelineDataStoreModel,
}
impl PipelineDataStoreInputModel {
    pub fn new(
        name: impl Into<String>,
        type_id: u32,
        data_store_description: impl Into<String>,
        configuration: impl Into<String>,
    ) -> Result<Self, IoTBeeError> {
        Ok(Self {
            name: FieldName::new(name)?,
            type_id: DataStoreId::new(type_id)?,
            data_store_description: DescriptionField::new(data_store_description)?,
            configuration: PipelineDataStoreModel::new(configuration)?,
        })
    }

    pub fn name(&self) -> &str {
        self.name.name()
    }
    pub fn type_id(&self) -> u32 {
        self.type_id.id()
    }
    pub fn configuration(&self) -> &str {
        self.configuration.value()
    }
    pub fn data_store_description(&self) -> &str {
        self.data_store_description.description()
    }
}

#[derive(Debug)]
pub struct PipelineDataStoreOutputModel {
    id: DataStoreId,
    name: FieldName,
    type_id: DataStoreId,
    store_type: String,
    configuration: PipelineDataStoreModel,
    data_store_description: DescriptionField,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
impl PipelineDataStoreOutputModel {
    pub fn new(
        id: u32,
        name: impl Into<String>,
        type_id: u32,
        store_type: impl Into<String>,
        configuration: impl Into<String>,
        data_store_description: impl Into<String>,
        created_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> Result<Self, IoTBeeError> {
        Ok(Self {
            id: DataStoreId::new(id)?,
            name: FieldName::new(name)?,
            type_id: DataStoreId::new(type_id)?,
            store_type: store_type.into(),
            configuration: PipelineDataStoreModel::new(configuration)?,
            data_store_description: DescriptionField::new(data_store_description)?,
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
    pub fn type_id(&self) -> u32 {
        self.type_id.id()
    }
    pub fn configuration(&self) -> &str {
        self.configuration.value()
    }
    pub fn data_store_description(&self) -> &str {
        self.data_store_description.description()
    }
    pub fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }
    pub fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }
    pub fn store_type(&self) -> &str {
        &self.store_type
    }
}
