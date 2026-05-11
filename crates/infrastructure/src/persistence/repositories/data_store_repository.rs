use crate::persistence::connection::InternalDataBase;
use crate::persistence::models::DataStoreRow;
use async_trait::async_trait;
use chrono::Utc;
use domain::entities::data_store::{PipelineDataStoreInputModel, PipelineDataStoreOutputModel};
use domain::error::{IoTBeeError, PipelinePersistenceError};
use domain::outbound::pipeline_persistence::PipelineDataStoreRepository;
use domain::value_objects::pipelines_values::DataStoreId;
use logging::AppLogger;
use sqlx::Error as SqlxError;
use std::sync::Arc;

static LOGGER: AppLogger =
    AppLogger::new("iot_bee::infrastructure::persistence::repositories::data_store_repository");

pub struct DataStoreRepository {
    pipeline_store_repository: Arc<InternalDataBase>,
}
impl DataStoreRepository {
    pub fn new(pipeline_store_repository: Arc<InternalDataBase>) -> Self {
        Self {
            pipeline_store_repository,
        }
    }
    pub fn data_base_connection(&self) -> &InternalDataBase {
        &self.pipeline_store_repository
    }
}

#[async_trait]
impl PipelineDataStoreRepository for DataStoreRepository {
    async fn save_pipeline_data_store(
        &self,
        data_store: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError> {
        let pool = self.data_base_connection().pool();
        sqlx::query(
            r#"
            INSERT INTO databases (name, store_type, json_schema, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(data_store.name())
        .bind(data_store.store_type_string())
        .bind(serde_json::to_string(data_store.configuration()).map_err(|e| {
            IoTBeeError::from(PipelinePersistenceError::InvalidData {
                reason: format!("Failed to serialize configuration: {}", e),
            })
        })?)
        .bind(data_store.data_store_description())
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .execute(pool)
        .await
        .map_err(|e| match e {
            SqlxError::Database(db_error) if db_error.is_unique_violation() => {
                PipelinePersistenceError::ValidationSchemaNameExists {
                    name: data_store.name().to_string(),
                }
            }
            SqlxError::Database(db_error) if db_error.is_foreign_key_violation() => {
                PipelinePersistenceError::InvalidData {
                    reason: db_error.to_string(),
                }
            }
            _ => PipelinePersistenceError::SaveFailed {
                reason: e.to_string(),
            },
        })?;

        Ok(())
    }

    async fn get_pipeline_data_store(
        &self,
    ) -> Result<Vec<PipelineDataStoreOutputModel>, IoTBeeError> {
        let pool = self.data_base_connection().pool();
        LOGGER.info("Fetching data stores from database...");
        let rows_result = sqlx::query_as::<_, DataStoreRow>(
            r#"
            SELECT id, name, store_type, json_schema, description, created_at, updated_at
            FROM databases
            "#,
        )
        .fetch_all(pool)
        .await
        .map_err(|e| {
            IoTBeeError::from(PipelinePersistenceError::Database {
                reason: e.to_string(),
            })
        })?;

        let result = rows_result
            .into_iter()
            .map(|row| row.try_into())
            .collect::<Result<Vec<PipelineDataStoreOutputModel>, IoTBeeError>>()?;

        let names = result
            .iter()
            .map(|ds| ds.name())
            .collect::<Vec<_>>()
            .join(", ");
        LOGGER.debug(&format!("Retrieved data stores: [{names}]"));
        Ok(result)
    }
    async fn get_pipeline_data_store_by_id(
        &self,
        data_store_id: &DataStoreId,
    ) -> Result<Option<PipelineDataStoreOutputModel>, IoTBeeError> {
        let pool = self.data_base_connection().pool();
        let row = sqlx::query_as::<_, DataStoreRow>(
            r#"
            SELECT id, name, store_type, json_schema, description, created_at, updated_at
            FROM databases
            WHERE id = ?
            "#,
        )
        .bind(data_store_id.id())
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            IoTBeeError::from(PipelinePersistenceError::Database {
                reason: e.to_string(),
            })
        })?;

        if let Some(row) = row {
            let data_store: PipelineDataStoreOutputModel = row.try_into()?;
            Ok(Some(data_store))
        } else {
            Ok(None)
        }
    }
}
