use crate::persistence::connection::InternalDataBase;
use crate::persistence::ids::pipeline_id_to_database;
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
        org_id: i64,
        data_store: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError> {
        let pool = self.data_base_connection().pool();
        sqlx::query(
            r#"
            INSERT INTO databases (name, store_type, json_schema, description, created_at, updated_at, organization_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
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
        .bind(org_id)
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
        org_id: i64,
    ) -> Result<Vec<PipelineDataStoreOutputModel>, IoTBeeError> {
        let pool = self.data_base_connection().pool();
        LOGGER.info("Fetching data stores from database...");
        let rows_result = sqlx::query_as::<_, DataStoreRow>(
            r#"
            SELECT id, name, store_type, json_schema, description, created_at, updated_at
            FROM databases
            WHERE organization_id = $1
            "#,
        )
        .bind(org_id)
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
        org_id: i64,
        data_store_id: &DataStoreId,
    ) -> Result<Option<PipelineDataStoreOutputModel>, IoTBeeError> {
        let pool = self.data_base_connection().pool();
        let row = sqlx::query_as::<_, DataStoreRow>(
            r#"
            SELECT id, name, store_type, json_schema, description, created_at, updated_at
            FROM databases
            WHERE id = $1 AND organization_id = $2
            "#,
        )
        .bind(pipeline_id_to_database(data_store_id.id()))
        .bind(org_id)
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

    async fn update_pipeline_data_store_configuration(
        &self,
        org_id: i64,
        data_store_id: &DataStoreId,
        new_config: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError> {
        let pool = self.data_base_connection().pool();
        let result = sqlx::query(
            r#"
            UPDATE databases
            SET store_type = $1, json_schema = $2, updated_at = $3
            WHERE id = $4 AND organization_id = $5
            "#,
        )
        .bind(new_config.store_type_string())
        .bind(
            serde_json::to_string(new_config.configuration()).map_err(|e| {
                IoTBeeError::from(PipelinePersistenceError::InvalidData {
                    reason: format!("Failed to serialize configuration: {}", e),
                })
            })?,
        )
        .bind(Utc::now().to_rfc3339())
        .bind(pipeline_id_to_database(data_store_id.id()))
        .bind(org_id)
        .execute(pool)
        .await
        .map_err(|e| match e {
            SqlxError::Database(db_error) if db_error.is_foreign_key_violation() => {
                PipelinePersistenceError::InvalidData {
                    reason: db_error.to_string(),
                }
            }
            _ => PipelinePersistenceError::UpdateFailed {
                reason: e.to_string(),
            },
        })?;

        if result.rows_affected() == 0 {
            return Err(PipelinePersistenceError::IdNotFound {
                id: data_store_id.id(),
            }
            .into());
        }

        Ok(())
    }
    async fn delete_pipeline_data_store(
        &self,
        org_id: i64,
        data_store_id: &DataStoreId,
    ) -> Result<(), IoTBeeError> {
        let pool = self.data_base_connection().pool();
        let result = sqlx::query(
            r#"
            DELETE FROM databases
            WHERE id = $1 AND organization_id = $2
            "#,
        )
        .bind(pipeline_id_to_database(data_store_id.id()))
        .bind(org_id)
        .execute(pool)
        .await
        .map_err(|e| match e {
            SqlxError::Database(db_error) if db_error.is_foreign_key_violation() => {
                LOGGER.warn(&format!(
                    "Cannot delete data store id={} because pipelines still reference it (FK violation)",
                    data_store_id.id()
                ));
                PipelinePersistenceError::DeleteFailed {
                    reason: "This data store is used by one or more pipelines. Reassign or delete those pipelines first, then try again.".to_string(),
                }
            }
            _ => PipelinePersistenceError::DeleteFailed {
                reason: e.to_string(),
            },
        })?;

        if result.rows_affected() == 0 {
            return Err(PipelinePersistenceError::IdNotFound {
                id: data_store_id.id(),
            }
            .into());
        }

        Ok(())
    }
}
