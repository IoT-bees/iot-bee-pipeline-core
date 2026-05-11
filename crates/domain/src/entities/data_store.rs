use crate::error::IoTBeeError;
use crate::value_objects::data_store_values::PipelineDataStoreModel;
use crate::value_objects::pipelines_values::{DataStoreId, DescriptionField, FieldName};
use chrono::{DateTime, Utc};

pub struct PipelineDataStoreInputModel {
    name: FieldName,
    configuration: PipelineDataStoreModel,
    data_store_description: DescriptionField,
}
impl PipelineDataStoreInputModel {
    pub fn new(
        name: impl Into<String>,
        configuration: PipelineDataStoreModel,
        data_store_description: impl Into<String>,
    ) -> Result<Self, IoTBeeError> {
        Ok(Self {
            name: FieldName::new(name)?,
            configuration,
            data_store_description: DescriptionField::new(data_store_description)?,
        })
    }

    pub fn name(&self) -> &str { self.name.name() }
    pub fn configuration(&self) -> &PipelineDataStoreModel { &self.configuration }
    pub fn store_type_string(&self) -> String { String::from(self.configuration.store_type()) }
    pub fn data_store_description(&self) -> &str { self.data_store_description.description() }
}

#[derive(Debug)]
pub struct PipelineDataStoreOutputModel {
    id: DataStoreId,
    name: FieldName,
    configuration: PipelineDataStoreModel,
    data_store_description: DescriptionField,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
impl PipelineDataStoreOutputModel {
    pub fn new(
        id: u32,
        name: impl Into<String>,
        configuration: PipelineDataStoreModel,
        data_store_description: impl Into<String>,
        created_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> Result<Self, IoTBeeError> {
        Ok(Self {
            id: DataStoreId::new(id)?,
            name: FieldName::new(name)?,
            configuration,
            data_store_description: DescriptionField::new(data_store_description)?,
            created_at,
            updated_at,
        })
    }
    pub fn id(&self) -> u32 { self.id.id() }
    pub fn name(&self) -> &str { self.name.name() }
    pub fn configuration(&self) -> &PipelineDataStoreModel { &self.configuration }
    pub fn store_type_string(&self) -> String { String::from(self.configuration.store_type()) }
    pub fn data_store_description(&self) -> &str { self.data_store_description.description() }
    pub fn created_at(&self) -> DateTime<Utc> { self.created_at }
    pub fn updated_at(&self) -> DateTime<Utc> { self.updated_at }
}
