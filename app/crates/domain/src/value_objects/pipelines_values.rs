use crate::error::DomainValidationError;
use crate::error::IoTBeeError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct DataStoreId(u32);
impl DataStoreId {
    pub fn new(id: u32) -> Result<Self, IoTBeeError> {
        if id == 0 {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "DataStoreId".to_string(),
                reason: "ID cannot be zero".to_string(),
            }
            .into());
        }
        Ok(DataStoreId(id))
    }
    pub fn id(&self) -> u32 {
        self.0
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PipelineStatus {
    Running,
    Stopped,
    Failed,
    Pending,
}
impl PipelineStatus {
    pub fn new(status: u32) -> Result<Self, IoTBeeError> {
        match status {
            0 => Ok(PipelineStatus::Running),
            1 => Ok(PipelineStatus::Stopped),
            2 => Ok(PipelineStatus::Pending),
            3 => Ok(PipelineStatus::Failed),
            _ => Err(DomainValidationError::InvalidFieldValue {
                field_name: "PipelineStatus".to_string(),
                reason: "Invalid status value".to_string(),
            }
            .into()),
        }
    }

    pub fn status(&self) -> u32 {
        match self {
            PipelineStatus::Running => 0,
            PipelineStatus::Stopped => 1,
            PipelineStatus::Pending => 2,
            PipelineStatus::Failed => 3,
        }
    }
}

pub enum PipelineDataSourceState {
    Active,
    Inactive,
    Error,
}

pub struct PipelineSchemaModel(String);
impl PipelineSchemaModel {
    pub fn new(schema: impl Into<String>) -> Result<Self, IoTBeeError> {
        //validar aca las caracteristicas que debe tener el schema, por ejemplo que sea un json valido, o que tenga ciertas propiedades, etc.
        // devolver el error de validacion de datos.
        Ok(Self(schema.into()))
    }
    pub fn schema(&self) -> &str {
        &self.0
    }
}

#[derive(Debug)]
pub struct FieldName(String);
impl FieldName {
    pub fn new(name: impl Into<String>) -> Result<Self, IoTBeeError> {
        let name_str = name.into();
        // Validar que el nombre del campo no esté vacío y cumpla con ciertas reglas
        if name_str.trim().is_empty() {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "PipelineFieldName".to_string(),
                reason: "Field name cannot be empty".to_string(),
            }
            .into());
        }

        Ok(Self(name_str))
    }
    pub fn name(&self) -> &str {
        &self.0
    }
}

#[derive(Debug)]
pub struct DescriptionField(String);
impl DescriptionField {
    pub fn new(description: impl Into<String>) -> Result<Self, IoTBeeError> {
        let description_str = description.into();

        if description_str.trim().is_empty() {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "DescriptionField".to_string(),
                reason: "Description cannot be empty".to_string(),
            }
            .into());
        }

        Ok(Self(description_str))
    }
    pub fn description(&self) -> &str {
        &self.0
    }
}

pub struct ReplicationFactor(u32);
impl ReplicationFactor {
    pub fn new(replication_factor: u32) -> Result<Self, IoTBeeError> {
        if replication_factor == 0 || replication_factor > 50 {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "ReplicationFactor".to_string(),
                reason: "Replication factor must be between 1 and 50".to_string(),
            }
            .into());
        }

        Ok(Self(replication_factor))
    }
    pub fn replication_factor(&self) -> u32 {
        self.0
    }
}
