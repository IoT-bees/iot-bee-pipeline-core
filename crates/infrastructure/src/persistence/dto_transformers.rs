use crate::persistence::models::{
    ConnectionTypeRow, DataSourceRow, DataStoreRow, PipelineGroupRow, PipelineRowFlat,
    ValidationSchemaRow, ValidationSchemaRowWhitId,
};
use domain::entities::connection_type::ConnectionTypeModel;
use domain::entities::data_source::PipelineDataSourceOutputModel;
use domain::value_objects::data_source_values::PipelineDataSourceConfig;
use domain::entities::data_store::PipelineDataStoreOutputModel;
use domain::value_objects::data_store_values::PipelineDataStoreModel;
use domain::entities::pipeline_data::PipelineDataOutputModel;
use domain::entities::pipeline_groups::PipelineGroupOutputModel;
use domain::entities::validation_schema::{
    PipelineNewValidateSchema, PipelineValidationSchemaModel,
};
use domain::error::{IoTBeeError, PipelinePersistenceError};

use chrono::DateTime;

use chrono::Utc;
use std::convert::TryFrom;

impl TryFrom<ValidationSchemaRow> for PipelineNewValidateSchema {
    type Error = IoTBeeError;

    fn try_from(row: ValidationSchemaRow) -> Result<Self, Self::Error> {
        let created_at = DateTime::parse_from_rfc3339(&row.created_at)
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid created_at: {}", e),
            })?
            .with_timezone(&Utc);

        let updated_at = DateTime::parse_from_rfc3339(&row.updated_at)
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid updated_at: {}", e),
            })?
            .with_timezone(&Utc);

        let result = PipelineNewValidateSchema::existing(
            row.json_name,
            row.json_schema,
            created_at,
            updated_at,
        )?;

        Ok(result)
    }
}

impl TryFrom<ValidationSchemaRowWhitId> for PipelineValidationSchemaModel {
    type Error = IoTBeeError;

    fn try_from(row: ValidationSchemaRowWhitId) -> Result<Self, Self::Error> {
        let created_at = DateTime::parse_from_rfc3339(&row.created_at)
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid created_at: {}", e),
            })?
            .with_timezone(&Utc);

        let updated_at = DateTime::parse_from_rfc3339(&row.updated_at)
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid updated_at: {}", e),
            })?
            .with_timezone(&Utc);

        Ok(PipelineValidationSchemaModel::new(
            row.id,
            row.json_name,
            row.json_schema,
            created_at,
            updated_at,
        )?)
    }
}

impl TryFrom<ConnectionTypeRow> for ConnectionTypeModel {
    type Error = IoTBeeError;

    fn try_from(row: ConnectionTypeRow) -> Result<Self, Self::Error> {
        Ok(ConnectionTypeModel::new(row.connection_type, row.id)?)
    }
}

impl TryFrom<DataSourceRow> for PipelineDataSourceOutputModel {
    type Error = IoTBeeError;

    fn try_from(row: DataSourceRow) -> Result<Self, Self::Error> {
        let created_at = DateTime::parse_from_rfc3339(&row.created_at)
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid created_at: {}", e),
            })?
            .with_timezone(&Utc);

        let updated_at = DateTime::parse_from_rfc3339(&row.updated_at)
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid updated_at: {}", e),
            })?
            .with_timezone(&Utc);

        let config = serde_json::from_str::<PipelineDataSourceConfig>(&row.data_source_configuration)
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid data_source_configuration: {}", e),
            })?;

        Ok(PipelineDataSourceOutputModel::new(
            row.id,
            row.name,
            config,
            row.data_source_description,
            created_at,
            updated_at,
        )?)
    }
}

impl TryFrom<PipelineGroupRow> for PipelineGroupOutputModel {
    type Error = IoTBeeError;

    fn try_from(row: PipelineGroupRow) -> Result<Self, Self::Error> {
        let created_at = DateTime::parse_from_rfc3339(&row.created_at)
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid created_at: {}", e),
            })?
            .with_timezone(&Utc);

        let updated_at = DateTime::parse_from_rfc3339(&row.updated_at)
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid updated_at: {}", e),
            })?
            .with_timezone(&Utc);

        Ok(PipelineGroupOutputModel::new(
            row.id,
            row.name,
            row.description,
            created_at,
            updated_at,
        )?)
    }
}

impl TryFrom<DataStoreRow> for PipelineDataStoreOutputModel {
    type Error = IoTBeeError;

    fn try_from(row: DataStoreRow) -> Result<Self, Self::Error> {
        let created_at = DateTime::parse_from_rfc3339(&row.created_at)
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid created_at: {}", e),
            })?
            .with_timezone(&Utc);

        let updated_at = DateTime::parse_from_rfc3339(&row.updated_at)
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid updated_at: {}", e),
            })?
            .with_timezone(&Utc);

        let config = serde_json::from_str::<PipelineDataStoreModel>(&row.json_schema)
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid json_schema: {}", e),
            })?;

        Ok(PipelineDataStoreOutputModel::new(
            row.id,
            row.name,
            config,
            row.description,
            created_at,
            updated_at,
        )?)
    }
}

impl TryFrom<PipelineRowFlat> for PipelineDataOutputModel {
    type Error = IoTBeeError;

    fn try_from(value: PipelineRowFlat) -> Result<Self, Self::Error> {
        let created_at = DateTime::parse_from_rfc3339(&value.created_at)
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid created_at: {}", e),
            })?
            .with_timezone(&Utc);

        let updated_at = DateTime::parse_from_rfc3339(&value.updated_at)
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid updated_at: {}", e),
            })?
            .with_timezone(&Utc);

        Ok(PipelineDataOutputModel::new(
            value.id,
            value.name,
            value.group_id,
            value.group_name,
            value.db_id,
            value.db_name,
            value.data_source_id,
            value.data_source_name,
            value.validation_schema_id,
            value.validation_schema_name,
            value.replicas,
            value.status,
            created_at,
            updated_at,
        )?)
    }
}
