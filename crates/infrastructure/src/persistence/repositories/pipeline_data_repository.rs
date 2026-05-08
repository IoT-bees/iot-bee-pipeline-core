use crate::persistence::connection::InternalDataBase;
use crate::persistence::models::PipelineRowFlat;
use async_trait::async_trait;
use chrono::Utc;
use domain::entities::pipeline_data::{PipelineDataInputModel, PipelineDataOutputModel};
use domain::error::{IoTBeeError, PipelinePersistenceError};
use domain::outbound::pipeline_persistence::PipelineControllerRepository;
use domain::value_objects::pipelines_values::DataStoreId;
use sqlx::Error as SqlxError;
use std::sync::Arc;

pub struct PipelineDataRepository {
    pipeline_store_repository: Arc<InternalDataBase>,
}
impl PipelineDataRepository {
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
impl PipelineControllerRepository for PipelineDataRepository {
    async fn save_pipeline(&self, pipeline: &PipelineDataInputModel) -> Result<(), IoTBeeError> {
        let pool = self.data_base_connection().pool();
        sqlx::query(
            r#"
            INSERT INTO pipelines (name, group_id, db_id, data_source_id, validation_schema_id, replicas, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(pipeline.name())
        .bind(pipeline.group_id())
        .bind(pipeline.store_id())
        .bind(pipeline.data_source_id())
        .bind(pipeline.validation_schema_id())
        .bind(pipeline.pipeline_replication())
        .bind(pipeline.is_active())
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .execute(pool)
        .await
        .map_err(|e| {
            match e {
                SqlxError::Database(db_error) if db_error.is_unique_violation() => {PipelinePersistenceError::ValidationSchemaNameExists{ name: pipeline.name().to_string() }},
                SqlxError::Database(db_error) if db_error.is_foreign_key_violation() => {PipelinePersistenceError::InvalidData { reason: db_error.to_string() }},
                _ => PipelinePersistenceError::SaveFailed { reason: e.to_string() },
            }
        })?;

        Ok(())
    }

    async fn get_pipeline(&self) -> Result<Vec<PipelineDataOutputModel>, IoTBeeError> {
        let pool = self.data_base_connection().pool();
        let rows_result = sqlx::query_as::<_, PipelineRowFlat>(
            r#"
            SELECT 
                p.id,
                p.name,

                pg.id as group_id,
                pg.name as group_name,

                d.id as db_id,
                d.name as db_name,

                ds.id as data_source_id,
                ds.name as data_source_name,

                vs.id as validation_schema_id,
                vs.json_name as validation_schema_name,

                p.replicas,
                p.status,
                p.created_at,
                p.updated_at

            FROM pipelines p
            JOIN pipeline_groups pg ON p.group_id = pg.id
            JOIN databases d ON p.db_id = d.id
            JOIN data_sources ds ON p.data_source_id = ds.id
            JOIN validation_schemas vs ON p.validation_schema_id = vs.id
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
            .collect::<Result<Vec<PipelineDataOutputModel>, _>>()?;

        Ok(result)
    }

    async fn get_pipeline_by_id(
        &self,
        pipeline_id: &DataStoreId,
    ) -> Result<Option<PipelineDataOutputModel>, IoTBeeError> {
        let pool = self.data_base_connection().pool();
        let row_result = sqlx::query_as::<_, PipelineRowFlat>(
            r#"
            SELECT 
                p.id,
                p.name,

                pg.id as group_id,
                pg.name as group_name,

                d.id as db_id,
                d.name as db_name,

                ds.id as data_source_id,
                ds.name as data_source_name,

                vs.id as validation_schema_id,
                vs.json_name as validation_schema_name,

                p.replicas,
                p.status,
                p.created_at,
                p.updated_at

            FROM pipelines p
            JOIN pipeline_groups pg ON p.group_id = pg.id
            JOIN databases d ON p.db_id = d.id
            JOIN data_sources ds ON p.data_source_id = ds.id
            JOIN validation_schemas vs ON p.validation_schema_id = vs.id
            WHERE p.id = ?
            "#,
        )
        .bind(pipeline_id.id())
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            IoTBeeError::from(PipelinePersistenceError::Database {
                reason: e.to_string(),
            })
        })?;

        let result = row_result.map(|row| row.try_into()).transpose()?;

        Ok(result)
    }

    async fn update_pipeline_state(
        &self,
        pipeline_id: &DataStoreId,
        is_active: bool,
    ) -> Result<(), IoTBeeError> {
        let pool = self.data_base_connection().pool();
        sqlx::query(
            r#"
            UPDATE pipelines
            SET status = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(is_active)
        .bind(Utc::now().to_rfc3339())
        .bind(pipeline_id.id())
        .execute(pool)
        .await
        .map_err(|e| {
            IoTBeeError::from(PipelinePersistenceError::Database {
                reason: e.to_string(),
            })
        })?;

        Ok(())
    }

    async fn get_pipeline_state_by_id(
        &self,
        pipeline_id: &DataStoreId,
    ) -> Result<Option<bool>, IoTBeeError> {
        let pool = self.data_base_connection().pool();
        let row_result = sqlx::query_scalar(
            r#"
            SELECT status
            FROM pipelines
            WHERE id = ?
            "#,
        )
        .bind(pipeline_id.id())
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            IoTBeeError::from(PipelinePersistenceError::Database {
                reason: e.to_string(),
            })
        })?;

        Ok(row_result)
    }

    async fn delete_pipeline_by_id(&self, pipeline_id: &DataStoreId) -> Result<(), IoTBeeError> {
        let pool = self.data_base_connection().pool();
        sqlx::query(
            r#"
            DELETE FROM pipelines
            WHERE id = ?
            "#,
        )
        .bind(pipeline_id.id())
        .execute(pool)
        .await
        .map_err(|e| {
            IoTBeeError::from(PipelinePersistenceError::Database {
                reason: e.to_string(),
            })
        })?;

        Ok(())
    }

    async fn get_pipeline_by_group_id(
        &self,
        group_id: &DataStoreId,
    ) -> Result<Vec<PipelineDataOutputModel>, IoTBeeError> {
        let pool = self.data_base_connection().pool();
        let rows_result = sqlx::query_as::<_, PipelineRowFlat>(
            r#"
            SELECT 
                p.id,
                p.name,

                pg.id as group_id,
                pg.name as group_name,

                d.id as db_id,
                d.name as db_name,

                ds.id as data_source_id,
                ds.name as data_source_name,

                vs.id as validation_schema_id,
                vs.json_name as validation_schema_name,

                p.replicas,
                p.status,
                p.created_at,
                p.updated_at

            FROM pipelines p
            JOIN pipeline_groups pg ON p.group_id = pg.id
            JOIN databases d ON p.db_id = d.id
            JOIN data_sources ds ON p.data_source_id = ds.id
            JOIN validation_schemas vs ON p.validation_schema_id = vs.id
            WHERE pg.id = ?
            "#,
        )
        .bind(group_id.id())
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
            .collect::<Result<Vec<PipelineDataOutputModel>, _>>()?;

        Ok(result)
    }

    async fn update_pipeline_data_source(
        &self,
        pipeline_id: &DataStoreId,
        data_source_id: &DataStoreId,
    ) -> Result<(), IoTBeeError> {
        let pool = self.data_base_connection().pool();

        let result = sqlx::query(
            r#"
            UPDATE pipelines
            SET data_source_id = ?, updated_at = ?
            WHERE id = ?
            AND EXISTS (
                SELECT 1 FROM data_sources WHERE id = ?
            )
            "#,
        )
        .bind(data_source_id.id())
        .bind(Utc::now().to_rfc3339())
        .bind(pipeline_id.id())
        .bind(data_source_id.id())
        .execute(pool)
        .await
        .map_err(|e| {
            IoTBeeError::from(PipelinePersistenceError::Database {
                reason: e.to_string(),
            })
        })?;

        if result.rows_affected() == 0 {
            // Determinar cuál de los dos no existe
            let pipeline_exists: bool =
                sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM pipelines WHERE id = ?)")
                    .bind(pipeline_id.id())
                    .fetch_one(pool)
                    .await
                    .map_err(|e| {
                        IoTBeeError::from(PipelinePersistenceError::Database {
                            reason: e.to_string(),
                        })
                    })?;

            return Err(IoTBeeError::from(if pipeline_exists {
                PipelinePersistenceError::UpdateFailed {
                    reason: format!("Data source id={} not found", data_source_id.id()),
                }
            } else {
                PipelinePersistenceError::UpdateFailed {
                    reason: format!("Pipeline id={} not found", pipeline_id.id()),
                }
            }));
        }

        Ok(())
    }

    async fn update_pipeline_data_store(
        &self,
        pipeline_id: &DataStoreId,
        data_store_id: &DataStoreId,
    ) -> Result<(), IoTBeeError> {
        let pool = self.data_base_connection().pool();

        let result = sqlx::query(
            r#"
            UPDATE pipelines
            SET db_id = ?, updated_at = ?
            WHERE id = ?
            AND EXISTS (
                SELECT 1 FROM databases WHERE id = ?
            )
            "#,
        )
        .bind(data_store_id.id())
        .bind(Utc::now().to_rfc3339())
        .bind(pipeline_id.id())
        .bind(data_store_id.id())
        .execute(pool)
        .await
        .map_err(|e| {
            IoTBeeError::from(PipelinePersistenceError::Database {
                reason: e.to_string(),
            })
        })?;

        if result.rows_affected() == 0 {
            // Determinar cuál de los dos no existe
            let pipeline_exists: bool =
                sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM pipelines WHERE id = ?)")
                    .bind(pipeline_id.id())
                    .fetch_one(pool)
                    .await
                    .map_err(|e| {
                        IoTBeeError::from(PipelinePersistenceError::Database {
                            reason: e.to_string(),
                        })
                    })?;

            return Err(IoTBeeError::from(if pipeline_exists {
                PipelinePersistenceError::UpdateFailed {
                    reason: format!("Data store id={} not found", data_store_id.id()),
                }
            } else {
                PipelinePersistenceError::UpdateFailed {
                    reason: format!("Pipeline id={} not found", pipeline_id.id()),
                }
            }));
        }

        Ok(())
    }

    async fn update_pipeline_validation_schema(
        &self,
        pipeline_id: &DataStoreId,
        validation_schema_id: &DataStoreId,
    ) -> Result<(), IoTBeeError> {
        let pool = self.data_base_connection().pool();

        let result = sqlx::query(
            r#"
            UPDATE pipelines
            SET validation_schema_id = ?, updated_at = ?
            WHERE id = ?
            AND EXISTS (
                SELECT 1 FROM validation_schemas WHERE id = ?
            )
            "#,
        )
        .bind(validation_schema_id.id())
        .bind(Utc::now().to_rfc3339())
        .bind(pipeline_id.id())
        .bind(validation_schema_id.id())
        .execute(pool)
        .await
        .map_err(|e| {
            IoTBeeError::from(PipelinePersistenceError::Database {
                reason: e.to_string(),
            })
        })?;

        if result.rows_affected() == 0 {
            // Determinar cuál de los dos no existe
            let pipeline_exists: bool =
                sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM pipelines WHERE id = ?)")
                    .bind(pipeline_id.id())
                    .fetch_one(pool)
                    .await
                    .map_err(|e| {
                        IoTBeeError::from(PipelinePersistenceError::Database {
                            reason: e.to_string(),
                        })
                    })?;

            return Err(IoTBeeError::from(if pipeline_exists {
                PipelinePersistenceError::UpdateFailed {
                    reason: format!(
                        "Validation schema id={} not found",
                        validation_schema_id.id()
                    ),
                }
            } else {
                PipelinePersistenceError::UpdateFailed {
                    reason: format!("Pipeline id={} not found", pipeline_id.id()),
                }
            }));
        }

        Ok(())
    }

    async fn update_pipeline_group(
        &self,
        pipeline_id: &DataStoreId,
        group_id: &DataStoreId,
    ) -> Result<(), IoTBeeError> {
        let pool = self.data_base_connection().pool();

        let result = sqlx::query(
            r#"
            UPDATE pipelines
            SET group_id = ?, updated_at = ?
            WHERE id = ?
            AND EXISTS (
                SELECT 1 FROM pipeline_groups WHERE id = ?
            )
            "#,
        )
        .bind(group_id.id())
        .bind(Utc::now().to_rfc3339())
        .bind(pipeline_id.id())
        .bind(group_id.id())
        .execute(pool)
        .await
        .map_err(|e| {
            IoTBeeError::from(PipelinePersistenceError::Database {
                reason: e.to_string(),
            })
        })?;

        if result.rows_affected() == 0 {
            // Determinar cuál de los dos no existe
            let pipeline_exists: bool =
                sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM pipelines WHERE id = ?)")
                    .bind(pipeline_id.id())
                    .fetch_one(pool)
                    .await
                    .map_err(|e| {
                        IoTBeeError::from(PipelinePersistenceError::Database {
                            reason: e.to_string(),
                        })
                    })?;

            return Err(IoTBeeError::from(if pipeline_exists {
                PipelinePersistenceError::UpdateFailed {
                    reason: format!("Group id={} not found", group_id.id()),
                }
            } else {
                PipelinePersistenceError::UpdateFailed {
                    reason: format!("Pipeline id={} not found", pipeline_id.id()),
                }
            }));
        }

        Ok(())
    }

}
