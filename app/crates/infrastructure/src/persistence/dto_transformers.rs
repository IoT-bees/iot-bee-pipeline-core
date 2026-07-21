use crate::persistence::ids::database_id_to_pipeline;
use crate::persistence::models::{
    ConnectionTypeRow, DataSourceRow, DataStoreRow, LicenseSubscriptionRow, PipelineGroupRow,
    PipelineRowFlat, ValidationSchemaRow, ValidationSchemaRowWhitId,
};
use domain::entities::connection_type::ConnectionTypeModel;
use domain::entities::data_source::PipelineDataSourceOutputModel;
use domain::entities::data_store::PipelineDataStoreOutputModel;
use domain::entities::license::{LicensePlan, LicenseState, LicenseSubscription};
use domain::entities::pipeline_data::PipelineDataOutputModel;
use domain::entities::pipeline_groups::PipelineGroupOutputModel;
use domain::entities::validation_schema::{
    PipelineNewValidateSchema, PipelineValidationSchemaModel,
};
use domain::error::{IoTBeeError, PipelinePersistenceError};
use domain::value_objects::data_source_values::PipelineDataSourceConfig;
use domain::value_objects::data_store_values::PipelineDataStoreModel;

use chrono::{DateTime, NaiveDateTime, Utc};
use std::convert::TryFrom;

/// Parsea fechas en formato RFC3339 (guardado por la app) o en formato
/// "YYYY-MM-DD HH:MM:SS" (formato persistido por las migraciones de PostgreSQL).
fn parse_datetime(s: &str) -> Result<DateTime<Utc>, String> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
        return Ok(dt.with_timezone(&Utc));
    }
    NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")
        .map(|ndt| ndt.and_utc())
        .map_err(|e| format!("formato no reconocido '{}': {}", s, e))
}

/// Los identificadores públicos siguen siendo `u32`; PostgreSQL los almacena
/// como `BIGINT` para no limitar el crecimiento de las secuencias.
fn database_replication_to_domain(value: i32) -> Result<u32, IoTBeeError> {
    u32::try_from(value).map_err(|_| {
        PipelinePersistenceError::InvalidData {
            reason: format!("factor de replicación inválido: {value}"),
        }
        .into()
    })
}

impl TryFrom<ValidationSchemaRow> for PipelineNewValidateSchema {
    type Error = IoTBeeError;

    fn try_from(row: ValidationSchemaRow) -> Result<Self, Self::Error> {
        let created_at =
            parse_datetime(&row.created_at).map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid created_at: {}", e),
            })?;

        let updated_at =
            parse_datetime(&row.updated_at).map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid updated_at: {}", e),
            })?;

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
        let created_at =
            parse_datetime(&row.created_at).map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid created_at: {}", e),
            })?;

        let updated_at =
            parse_datetime(&row.updated_at).map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid updated_at: {}", e),
            })?;

        Ok(PipelineValidationSchemaModel::new(
            database_id_to_pipeline(row.id)?,
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
        Ok(ConnectionTypeModel::new(
            row.connection_type,
            database_id_to_pipeline(row.id)?,
        )?)
    }
}

impl TryFrom<DataSourceRow> for PipelineDataSourceOutputModel {
    type Error = IoTBeeError;

    fn try_from(row: DataSourceRow) -> Result<Self, Self::Error> {
        let created_at =
            parse_datetime(&row.created_at).map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid created_at: {}", e),
            })?;

        let updated_at =
            parse_datetime(&row.updated_at).map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid updated_at: {}", e),
            })?;

        let config =
            serde_json::from_str::<PipelineDataSourceConfig>(&row.data_source_configuration)
                .map_err(|e| PipelinePersistenceError::InvalidData {
                    reason: format!("invalid data_source_configuration: {}", e),
                })?;

        Ok(PipelineDataSourceOutputModel::new(
            database_id_to_pipeline(row.id)?,
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
        let created_at =
            parse_datetime(&row.created_at).map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid created_at: {}", e),
            })?;

        let updated_at =
            parse_datetime(&row.updated_at).map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid updated_at: {}", e),
            })?;

        Ok(PipelineGroupOutputModel::new(
            database_id_to_pipeline(row.id)?,
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
        let created_at =
            parse_datetime(&row.created_at).map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid created_at: {}", e),
            })?;

        let updated_at =
            parse_datetime(&row.updated_at).map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid updated_at: {}", e),
            })?;

        let config =
            serde_json::from_str::<PipelineDataStoreModel>(&row.json_schema).map_err(|e| {
                PipelinePersistenceError::InvalidData {
                    reason: format!("invalid json_schema: {}", e),
                }
            })?;

        Ok(PipelineDataStoreOutputModel::new(
            database_id_to_pipeline(row.id)?,
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
        let created_at = parse_datetime(&value.created_at).map_err(|e| {
            PipelinePersistenceError::InvalidData {
                reason: format!("invalid created_at: {}", e),
            }
        })?;

        let updated_at = parse_datetime(&value.updated_at).map_err(|e| {
            PipelinePersistenceError::InvalidData {
                reason: format!("invalid updated_at: {}", e),
            }
        })?;

        Ok(PipelineDataOutputModel::new(
            database_id_to_pipeline(value.id)?,
            value.name,
            database_id_to_pipeline(value.group_id)?,
            value.group_name,
            database_id_to_pipeline(value.db_id)?,
            value.db_name,
            database_id_to_pipeline(value.data_source_id)?,
            value.data_source_name,
            database_id_to_pipeline(value.validation_schema_id)?,
            value.validation_schema_name,
            database_replication_to_domain(value.replicas)?,
            value.status,
            created_at,
            updated_at,
        )?)
    }
}

impl TryFrom<LicenseSubscriptionRow> for LicenseSubscription {
    type Error = IoTBeeError;

    fn try_from(row: LicenseSubscriptionRow) -> Result<Self, Self::Error> {
        let activated_at = parse_datetime(&row.activated_at).map_err(|e| {
            PipelinePersistenceError::InvalidData {
                reason: format!("invalid license activated_at: {}", e),
            }
        })?;
        let expires_at = row
            .expires_at
            .as_deref()
            .map(parse_datetime)
            .transpose()
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid license expires_at: {}", e),
            })?;
        let last_checked_at = parse_datetime(&row.last_checked_at).map_err(|e| {
            PipelinePersistenceError::InvalidData {
                reason: format!("invalid license last_checked_at: {}", e),
            }
        })?;
        let current_period_end = row
            .current_period_end
            .as_deref()
            .map(parse_datetime)
            .transpose()
            .map_err(|e| PipelinePersistenceError::InvalidData {
                reason: format!("invalid license current_period_end: {}", e),
            })?;

        Ok(LicenseSubscription::new(
            row.license_key,
            LicensePlan::from_str(&row.plan)?,
            LicenseState::from_str(&row.state)?,
            activated_at,
            expires_at,
            last_checked_at,
        ))
        .map(|subscription| {
            subscription.with_stripe_billing(
                row.stripe_customer_id,
                row.stripe_subscription_id,
                row.stripe_checkout_session_id,
                row.stripe_subscription_status,
                row.stripe_payment_status,
                current_period_end,
                row.cancel_at_period_end,
                row.latest_invoice_id,
                row.amount_cents,
                row.currency,
            )
        })
    }
}
