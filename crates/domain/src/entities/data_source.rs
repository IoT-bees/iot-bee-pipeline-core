use crate::error::{IoTBeeError, PipelinePersistenceError};
use crate::value_objects::pipelines_values::{DataStoreId, DescriptionField, FieldName};
use chrono::{DateTime, Utc};
/// Modelo de entrada para registrar un nuevo data source.
pub struct PipelineDataSourceInputModel {
    name: FieldName,
    data_source_type_id: DataStoreId,
    data_source_configuration: String,
    data_source_description: DescriptionField,
    source_type: String,
}
impl PipelineDataSourceInputModel {
    pub fn new(
        name: impl Into<String>,
        data_source_type_id: u32,
        data_source_configuration: impl Into<String>,
        source_type: impl Into<String>,
        data_source_description: impl Into<String>,
    ) -> Result<Self, IoTBeeError> {
        Ok(Self {
            name: FieldName::new(name)?,
            data_source_type_id: DataStoreId::new(data_source_type_id)?,
            data_source_configuration: data_source_configuration.into(),
            data_source_description: DescriptionField::new(data_source_description)?,
            source_type: source_type.into(),
        })
    }

    pub fn name(&self) -> &str {
        self.name.name()
    }
    pub fn description(&self) -> &str {
        self.data_source_description.description()
    }
    pub fn data_source_type_id(&self) -> u32 {
        self.data_source_type_id.id()
    }
    pub fn data_source_configuration(&self) -> &str {
        &self.data_source_configuration
    }
    pub fn source_type(&self) -> &str {
        &self.source_type
    }
}

/// Modelo de salida para un data source existente en la base de datos.
pub struct PipelineDataSourceOutputModel {
    id: DataStoreId,
    name: FieldName,
    data_source_type_id: DataStoreId,
    data_source_state: String,
    data_source_configuration: String,
    data_source_description: DescriptionField,
    source_type: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl PipelineDataSourceOutputModel {
    pub fn new(
        id: u32,
        name: impl Into<String>,
        data_source_type_id: u32,
        data_source_state: impl Into<String>,
        data_source_configuration: impl Into<String>,
        source_type: impl Into<String>,
        data_source_description: impl Into<String>,
        created_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> Result<Self, IoTBeeError> {
        Ok(Self {
            id: DataStoreId::new(id)?,
            name: FieldName::new(name)?,
            data_source_type_id: DataStoreId::new(data_source_type_id)?,
            data_source_state: data_source_state.into(),
            data_source_configuration: data_source_configuration.into(),
            data_source_description: DescriptionField::new(data_source_description)?,
            source_type: source_type.into(),
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
        self.data_source_description.description()
    }
    pub fn data_source_type_id(&self) -> u32 {
        self.data_source_type_id.id()
    }
    pub fn data_source_state(&self) -> &str {
        &self.data_source_state
    }
    pub fn data_source_configuration(&self) -> &str {
        &self.data_source_configuration
    }
    pub fn source_type(&self) -> &str {
        &self.source_type
    }
    pub fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }
    pub fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }
}

pub struct PipelineDataSourceUpdateModel {
    data_source_type_id: Option<DataStoreId>,
    data_source_state: Option<String>,
    data_source_configuration: Option<String>,
    data_source_description: Option<DescriptionField>,
    source_type: Option<String>,
}
impl PipelineDataSourceUpdateModel {
    pub fn new(
        data_source_type_id: Option<u32>,
        data_source_state: Option<impl Into<String>>,
        data_source_configuration: Option<impl Into<String>>,
        source_type: Option<impl Into<String>>,
        data_source_description: Option<impl Into<String>>,
    ) -> Result<Self, IoTBeeError> {
        if data_source_type_id.is_none()
            && data_source_state.is_none()
            && data_source_configuration.is_none()
            && data_source_description.is_none()
            && source_type.is_none()
        {
            return Err(IoTBeeError::from(PipelinePersistenceError::InvalidData {
                reason: "At least one field must be provided for update".to_string(),
            }));
        }

        Ok(Self {
            data_source_type_id: data_source_type_id
                .map(|id| DataStoreId::new(id))
                .transpose()?,
            data_source_state: data_source_state.map(|s| s.into()),
            data_source_configuration: data_source_configuration.map(|c| c.into()),
            data_source_description: data_source_description
                .map(|d| DescriptionField::new(d))
                .transpose()?,
            source_type: source_type.map(|s| s.into()),
        })
    }

    pub fn description(&self) -> Option<&str> {
        self.data_source_description
            .as_ref()
            .map(|d| d.description())
    }
    pub fn data_source_type_id(&self) -> Option<u32> {
        self.data_source_type_id.as_ref().map(|id| id.id())
    }
    pub fn data_source_state(&self) -> Option<&str> {
        self.data_source_state.as_deref()
    }
    pub fn data_source_configuration(&self) -> Option<&str> {
        self.data_source_configuration.as_deref()
    }
    pub fn source_type(&self) -> Option<&str> {
        self.source_type.as_deref()
    }
}
