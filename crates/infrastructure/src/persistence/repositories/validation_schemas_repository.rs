use domain::outbound::pipeline_persistence::PipelineValidationSchemaRepository;
// use domain::outbound::PipelineGeneralRepository;
use crate::persistence::models::{ValidationSchemaRow, ValidationSchemaRowWhitId};
use async_trait::async_trait;
use domain::entities::validation_schema::{
    PipelineNewValidateSchema, PipelineValidationSchemaModel,
};
use domain::error::{IoTBeeError, PipelinePersistenceError};
use domain::value_objects::pipelines_values::DataStoreId;

use crate::persistence::connection::InternalDataBase;
use sqlx::Error as SqlxError;
use sqlx::Row;
use std::sync::Arc;
pub struct ValidationSchemaRepository {
    pipeline_store_repository: Arc<InternalDataBase>,
}
impl ValidationSchemaRepository {
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
impl PipelineValidationSchemaRepository for ValidationSchemaRepository {
    async fn save_pipeline_validation_schema(
        &self,
        schema: &PipelineNewValidateSchema,
    ) -> Result<(), IoTBeeError> {
        // Implementation to save the pipeline validation schema to the database
        // insertar un nuevo registro en la tabla de validaciones de la base de datos utilizando los datos del schema

        let pool = self.data_base_connection().pool();
        let schema_json = schema.schema();

        let result = sqlx::query(
            r#"
            INSERT INTO validation_schemas (json_name, json_schema, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            "#,
        )
        .bind(&schema.name())
        .bind(schema_json)
        .bind(&schema.created_at().to_rfc3339())
        .bind(&schema.updated_at().to_rfc3339())
        .execute(pool)
        .await;

        match result {
            Ok(_) => Ok(()),
            Err(SqlxError::Database(db_error)) if db_error.is_unique_violation() => Err(
                IoTBeeError::from(PipelinePersistenceError::ValidationSchemaNameExists {
                    name: schema.name().to_string(),
                }),
            ),

            Err(e) => Err(IoTBeeError::from(PipelinePersistenceError::SaveFailed {
                reason: e.to_string(),
            })),
        }
    }

    async fn delete_pipeline_validation_schema(
        &self,
        schema_id: &DataStoreId,
    ) -> Result<(), IoTBeeError> {
        // Implementation to delete the pipeline validation schema from the database
        let pool = self.data_base_connection().pool();
        let result = sqlx::query(
            r#"
                DELETE FROM validation_schemas WHERE id = ?
                "#,
        )
        .bind(&schema_id.id())
        .execute(pool)
        .await
        .map_err(|e| {
            IoTBeeError::from(domain::error::PipelinePersistenceError::DeleteFailed {
                reason: e.to_string(),
            })
        })?;

        if result.rows_affected() == 0 {
            return Err(IoTBeeError::from(PipelinePersistenceError::IdNotFound {
                id: schema_id.id(),
            }));
        }

        Ok(())
    }

    async fn update_pipeline_validation_schema(
        &self,
        schema_id: &DataStoreId,
        schema: &PipelineNewValidateSchema,
    ) -> Result<(), IoTBeeError> {
        // Implementation to update the pipeline validation schema in the database

        let schema_json = schema.schema();
        let pool = self.data_base_connection().pool();
        sqlx::query(
            r#"
            UPDATE validation_schemas 
            SET json_schema = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(schema_json)
        .bind(&schema.updated_at().to_rfc3339())
        .bind(&schema_id.id())
        .execute(pool)
        .await
        .map_err(|e| {
            IoTBeeError::from(domain::error::PipelinePersistenceError::UpdateFailed {
                reason: e.to_string(),
            })
        })?;

        Ok(())
    }

    async fn get_pipeline_validation_schema(
        &self,
        schema_id: &DataStoreId,
    ) -> Result<Option<PipelineNewValidateSchema>, IoTBeeError> {
        // Implementation to retrieve a specific pipeline validation schema from the database

        let pool = self.data_base_connection().pool();
        let row = sqlx::query_as::<_, ValidationSchemaRow>(
            r#"
            SELECT json_name, json_schema, created_at, updated_at
            FROM validation_schemas
            WHERE id = ?
            "#,
        )
        .bind(&schema_id.id())
        .fetch_optional(pool)
        .await
        .map_err(|e| PipelinePersistenceError::Database {
            reason: e.to_string(),
        })?;

        let result = row
            .map(|r| PipelineNewValidateSchema::try_from(r))
            .transpose()?;
        Ok(result)
    }

    async fn list_pipeline_validation_schema(
        &self,
    ) -> Result<Vec<PipelineValidationSchemaModel>, IoTBeeError> {
        // Implementation to list all pipeline validation schemas from the database
        let pool = self.data_base_connection().pool();
        let rows = sqlx::query_as::<_, ValidationSchemaRowWhitId>(
            r#"
            SELECT id, json_name, json_schema, created_at, updated_at
            FROM validation_schemas
            "#,
        )
        .fetch_all(pool)
        .await
        .map_err(|e| PipelinePersistenceError::Database {
            reason: e.to_string(),
        })?;

        let result = rows
            .into_iter()
            .map(|r| PipelineValidationSchemaModel::try_from(r))
            .collect::<Result<Vec<_>, _>>()?;

        Ok(result)
    }

    async fn update_pipeline_validation_schema_name(
        &self,
        schema_id: &DataStoreId,
        new_name: &str,
    ) -> Result<(), IoTBeeError> {
        // Implementation to update the name of a pipeline validation schema in the database
        let pool = self.data_base_connection().pool();
        let result = sqlx::query(
            r#"
            UPDATE validation_schemas 
            SET json_name = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(new_name)
        .bind(chrono::Utc::now().to_rfc3339())
        .bind(&schema_id.id())
        .execute(pool)
        .await;
        // .map_err(|e| IoTBeeError::from(
        //     domain::error::PipelinePersistenceError::UpdateFailed { reason: e.to_string() }
        // ))?;
        match result {
            Ok(_) => Ok(()),
            Err(SqlxError::Database(db_error)) if db_error.is_unique_violation() => Err(
                IoTBeeError::from(PipelinePersistenceError::ValidationSchemaNameExists {
                    name: new_name.to_string(),
                }),
            ),

            Err(e) => Err(IoTBeeError::from(PipelinePersistenceError::UpdateFailed {
                reason: e.to_string(),
            })),
        }
    }

    async fn get_pipelines_using_validation_schema(
        &self,
        schema_id: &DataStoreId,
    ) -> Result<Vec<DataStoreId>, IoTBeeError> {
        // Implementation to get the list of pipelines that are using a specific validation schema
        let pool = self.data_base_connection().pool();
        let rows = sqlx::query(
            r#"
                SELECT id
                FROM pipelines
                WHERE validation_schema_id = ?
                "#,
        )
        .bind(&schema_id.id())
        .fetch_all(pool)
        .await
        .map_err(|e| PipelinePersistenceError::Database {
            reason: e.to_string(),
        })?;

        let result = rows
            .into_iter()
            .filter_map(|row| {
                let pipeline_id: i32 = row.try_get("id").ok()?;
                Some(DataStoreId::new(pipeline_id as u32).ok()?)
            })
            .collect();

        Ok(result)
    }
}
