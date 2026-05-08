use crate::persistence::connection::InternalDataBase;
use crate::persistence::models::PipelineGroupRow;
use domain::entities::pipeline_groups::{PipelineGroupInputModel, PipelineGroupOutputModel};
use domain::error::{IoTBeeError, PipelinePersistenceError};
use domain::outbound::pipeline_persistence::PipelineGroupRepository;
use domain::value_objects::pipelines_values::DataStoreId;

use sqlx::Row;
use async_trait::async_trait;
use chrono::Utc;
use sqlx::Error as SqlxError;
use std::sync::Arc;
pub struct GroupRepository {
    pipeline_store_repository: Arc<InternalDataBase>,
}
impl GroupRepository {
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
impl PipelineGroupRepository for GroupRepository {
    async fn get_pipeline_group(&self) -> Result<Vec<PipelineGroupOutputModel>, IoTBeeError> {
        let pool = self.data_base_connection().pool();
        let result: Vec<PipelineGroupRow> = sqlx::query_as::<_, PipelineGroupRow>(
            r#"
            SELECT id, name, description, created_at, updated_at FROM pipeline_groups
            "#,
        )
        .fetch_all(pool)
        .await
        .map_err(|e| PipelinePersistenceError::Database {
            reason: e.to_string(),
        })?;

        let output: Vec<PipelineGroupOutputModel> = result
            .into_iter()
            .map(|row| row.try_into())
            .collect::<Result<_, _>>()?;

        Ok(output)
    }

    async fn get_pipeline_group_by_id(
        &self,
        group_id: &DataStoreId,
    ) -> Result<Option<PipelineGroupOutputModel>, IoTBeeError> {
        let pool = self.data_base_connection().pool();
        let result: Option<PipelineGroupRow> = sqlx::query_as::<_, PipelineGroupRow>(
            r#"
            SELECT id, name, description, created_at, updated_at FROM pipeline_groups WHERE id = ?
            "#,
        )
        .bind(group_id.id())
        .fetch_optional(pool)
        .await
        .map_err(|e| PipelinePersistenceError::Database {
            reason: e.to_string(),
        })?;

        let output = result.map(|row| row.try_into()).transpose()?;
        Ok(output)
    }

    async fn save_pipeline_group(
        &self,
        group: &PipelineGroupInputModel,
    ) -> Result<(), IoTBeeError> {
        let pool = self.data_base_connection().pool();
        let result = sqlx::query(
            r#"
            INSERT INTO pipeline_groups (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)
            "#,
        )
        .bind(&group.name())
        .bind(&group.description())
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .execute(pool)
        .await;

        match result {
            Ok(_) => Ok(()),
            Err(SqlxError::Database(db_error)) if db_error.is_unique_violation() => {
                Err(PipelinePersistenceError::ValidationSchemaNameExists {
                    name: group.name().to_string(),
                }
                .into())
            }
            Err(e) => Err(IoTBeeError::from(PipelinePersistenceError::SaveFailed {
                reason: e.to_string(),
            })),
        }
    }

    async fn get_pipelines_using_group(
        &self,
        group_id: &DataStoreId,
    ) -> Result<Vec<DataStoreId>, IoTBeeError> {
        let pool = self.data_base_connection().pool();
        let rows = sqlx::query(
            r#"
            SELECT id FROM pipelines WHERE group_id = ?
            "#,
        )
        .bind(group_id.id())
        .fetch_all(pool)
        .await
        .map_err(|e| PipelinePersistenceError::Database {
            reason: e.to_string(),
        })?;

        let pipeline_ids = rows
            .into_iter()
            .map(|row| {
                let pipeline_id: i64 = row.try_get("id").map_err(|e| {
                    PipelinePersistenceError::Database {
                        reason: e.to_string(),
                    }
                })?;
                DataStoreId::new(pipeline_id as u32)
            })
            .collect::<Result<Vec<_>, _>>()?;

        Ok(pipeline_ids)
    } 

    async fn delete_pipeline_group(&self, group_id: &DataStoreId) -> Result<(), IoTBeeError> {
        let pool = self.data_base_connection().pool();
        let result = sqlx::query(
            r#"
            DELETE FROM pipeline_groups WHERE id = ?
            "#,
        )
        .bind(group_id.id())
        .execute(pool)
        .await
        .map_err(|e| {
            PipelinePersistenceError::Database {
                reason: e.to_string(),
            }
        })?;

        if result.rows_affected() == 0 {
            return Err(IoTBeeError::from(PipelinePersistenceError::IdNotFound {
                id: group_id.id(),
            }));
        }

        Ok(())
    }
    }
