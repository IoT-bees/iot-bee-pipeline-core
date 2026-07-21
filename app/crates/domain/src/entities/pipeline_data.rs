use crate::error::IoTBeeError;
use crate::value_objects::pipelines_values::{DataStoreId, FieldName};
use chrono::{DateTime, Utc};

pub struct PipelineDataInputModel {
    name: FieldName,
    group_id: DataStoreId,
    store_id: DataStoreId,
    data_source_id: DataStoreId,
    validation_schema_id: DataStoreId,
    pipeline_replication: u32,
    is_active: bool,
}
impl PipelineDataInputModel {
    pub fn new(
        name: impl Into<String>,
        group_id: u32,
        store_id: u32,
        data_source_id: u32,
        validation_schema_id: u32,
        pipeline_replication: u32,
        is_active: bool,
    ) -> Result<Self, IoTBeeError> {
        Ok(Self {
            name: FieldName::new(name)?,
            group_id: DataStoreId::new(group_id)?,
            store_id: DataStoreId::new(store_id)?,
            data_source_id: DataStoreId::new(data_source_id)?,
            validation_schema_id: DataStoreId::new(validation_schema_id)?,
            pipeline_replication,
            is_active,
        })
    }

    pub fn name(&self) -> &str {
        self.name.name()
    }
    pub fn group_id(&self) -> u32 {
        self.group_id.id()
    }
    pub fn store_id(&self) -> u32 {
        self.store_id.id()
    }
    pub fn data_source_id(&self) -> u32 {
        self.data_source_id.id()
    }
    pub fn validation_schema_id(&self) -> u32 {
        self.validation_schema_id.id()
    }
    pub fn pipeline_replication(&self) -> u32 {
        self.pipeline_replication
    }
    pub fn is_active(&self) -> bool {
        self.is_active
    }
}

pub struct PipelineDataOutputModel {
    id: DataStoreId,
    name: FieldName,

    group_id: DataStoreId,
    group_name: FieldName,

    store_id: DataStoreId,
    store_name: FieldName,

    data_source_id: DataStoreId,
    data_source_name: FieldName,

    validation_schema_id: DataStoreId,
    validation_schema_name: FieldName,

    pipeline_replication: u32,
    pipeline_status: bool,

    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
impl PipelineDataOutputModel {
    pub fn new(
        id: u32,
        name: impl Into<String>,
        group_id: u32,
        group_name: impl Into<String>,
        store_id: u32,
        store_name: impl Into<String>,
        data_source_id: u32,
        data_source_name: impl Into<String>,
        validation_schema_id: u32,
        validation_schema_name: impl Into<String>,
        pipeline_replication: u32,
        is_active: bool,
        created_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> Result<Self, IoTBeeError> {
        Ok(Self {
            id: DataStoreId::new(id)?,
            name: FieldName::new(name)?,
            group_id: DataStoreId::new(group_id)?,
            group_name: FieldName::new(group_name)?,
            store_id: DataStoreId::new(store_id)?,
            store_name: FieldName::new(store_name)?,
            data_source_id: DataStoreId::new(data_source_id)?,
            data_source_name: FieldName::new(data_source_name)?,
            validation_schema_id: DataStoreId::new(validation_schema_id)?,
            validation_schema_name: FieldName::new(validation_schema_name)?,
            pipeline_replication,
            pipeline_status: is_active,
            created_at,
            updated_at,
        })
    }

    pub fn id(&self) -> &DataStoreId {
        &self.id
    }
    pub fn proper_id(&self) -> DataStoreId {
        self.id.clone()
    }

    pub fn name(&self) -> &str {
        self.name.name()
    }
    pub fn group_id(&self) -> u32 {
        self.group_id.id()
    }
    pub fn group_name(&self) -> &str {
        self.group_name.name()
    }
    pub fn store_id(&self) -> u32 {
        self.store_id.id()
    }
    pub fn store_name(&self) -> &str {
        self.store_name.name()
    }
    pub fn data_source_id(&self) -> u32 {
        self.data_source_id.id()
    }
    pub fn data_source_name(&self) -> &str {
        self.data_source_name.name()
    }
    pub fn validation_schema_id(&self) -> u32 {
        self.validation_schema_id.id()
    }
    pub fn validation_schema_name(&self) -> &str {
        self.validation_schema_name.name()
    }
    pub fn pipeline_replication(&self) -> u32 {
        self.pipeline_replication
    }
    pub fn is_active(&self) -> bool {
        self.pipeline_status
    }
    pub fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }
    pub fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }
}

pub struct PipelineConfiguration {
    pipeline_name: FieldName,
    pipeline_replication: u32,
}

impl PipelineConfiguration {
    pub fn new(
        pipeline_name: impl Into<String>,
        pipeline_replication: u32,
    ) -> Result<Self, IoTBeeError> {
        Ok(Self {
            pipeline_name: FieldName::new(pipeline_name)?,
            pipeline_replication,
        })
    }

    pub fn pipeline_name(&self) -> &str {
        self.pipeline_name.name()
    }
    pub fn pipeline_replication(&self) -> u32 {
        self.pipeline_replication
    }
}
