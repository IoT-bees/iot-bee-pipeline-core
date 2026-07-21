//domain imports
use domain::entities::data_source::{
    PipelineDataSourceInputModel, PipelineDataSourceOutputModel, PipelineDataSourceUpdateModel,
};
use domain::error::{IoTBeeError, PipelinePersistenceError};
use domain::outbound::pipeline_persistence::PipelineDataSourceRepository;
//crate imports
use crate::persistence::connection::InternalDataBase;
use crate::persistence::ids::{database_id_to_pipeline, pipeline_id_to_database};
use crate::persistence::models::DataSourceRow;
use domain::value_objects::pipelines_values::{DataStoreId, FieldName};

use async_trait::async_trait;
use chrono::Utc;
use sqlx::Error as SqlxError;
use sqlx::{Postgres, QueryBuilder, Row};
use std::sync::Arc;

pub struct DataSourceRepository {
    pipeline_store_repository: Arc<InternalDataBase>,
}
impl DataSourceRepository {
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

impl PipelineDataSourceRepository for DataSourceRepository {
    async fn save_pipeline_data_source(
        &self,
        org_id: i64,
        data_source: &PipelineDataSourceInputModel,
    ) -> Result<(), IoTBeeError> {
        let pool = self.data_base_connection().pool();

        let result = sqlx::query(
                r#"
                INSERT INTO data_sources (name, source_type, data_source_configuration, data_source_description, created_at, updated_at, organization_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                "#,
            )
            .bind(data_source.name())
            .bind(data_source.source_type_string())
            .bind(serde_json::to_string(data_source.data_source_configuration()).map_err(|e| {
                IoTBeeError::from(PipelinePersistenceError::SaveFailed {
                    reason: format!("Failed to serialize data source configuration: {}", e),
                })
            })?)
            .bind(data_source.description())
            .bind(Utc::now().to_rfc3339())
            .bind(Utc::now().to_rfc3339())
            .bind(org_id)
            .execute(pool)
            .await;

        match result {
            Ok(_) => Ok(()),
            Err(SqlxError::Database(db_error)) if db_error.is_unique_violation() => Err(
                IoTBeeError::from(PipelinePersistenceError::ValidationSchemaNameExists {
                    name: data_source.name().to_string(),
                }),
            ),
            Err(e) => Err(IoTBeeError::from(PipelinePersistenceError::SaveFailed {
                reason: e.to_string(),
            })),
        }
    }

    async fn get_pipeline_data_source(
        &self,
        org_id: i64,
        data_source_id: &DataStoreId,
    ) -> Result<Option<PipelineDataSourceOutputModel>, IoTBeeError> {
        // Implementation to get the pipeline data source from the database
        let pool = self.data_base_connection().pool();
        let result = sqlx::query_as::<_, DataSourceRow>(
            r#"
            SELECT id, name, data_source_state, data_source_configuration, data_source_description, source_type, created_at, updated_at
            FROM data_sources
            WHERE id = $1 AND organization_id = $2
            "#,
        )
        .bind(pipeline_id_to_database(data_source_id.id()))
        .bind(org_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| PipelinePersistenceError::Database {
            reason: e.to_string(),
        })?;

        let result = result
            .map(PipelineDataSourceOutputModel::try_from)
            .transpose()?;
        Ok(result)
    }

    async fn list_pipeline_data_source(
        &self,
        org_id: i64,
    ) -> Result<Vec<PipelineDataSourceOutputModel>, IoTBeeError> {
        // Implementation to list all pipeline data sources from the database
        let pool = self.data_base_connection().pool();
        let rows = sqlx::query_as::<_, DataSourceRow>(
            r#"
            SELECT id, name, data_source_state, data_source_configuration, data_source_description, source_type, created_at, updated_at
            FROM data_sources
            WHERE organization_id = $1
            "#,
        )
        .bind(org_id)
        .fetch_all(pool)
        .await
        .map_err(|e| PipelinePersistenceError::Database {
            reason: e.to_string(),
        })?;

        let result = rows
            .into_iter()
            .map(PipelineDataSourceOutputModel::try_from)
            .collect::<Result<Vec<_>, _>>()?;

        Ok(result)
    }

    async fn update_pipeline_data_source(
        &self,
        org_id: i64,
        data_source_id: &DataStoreId,
        data_source: &PipelineDataSourceUpdateModel,
    ) -> Result<(), IoTBeeError> {
        // Implementation to update the pipeline data source in the database
        let pool = self.data_base_connection().pool();
        //validar de data source que campos estan none y solo actuliar los campos que tengan contenido
        let mut query = QueryBuilder::<Postgres>::new("UPDATE data_sources SET ");
        let mut updates = query.separated(", ");

        if let Some(data_source_state) = &data_source.data_source_state() {
            updates
                .push("data_source_state = ")
                .push_bind(data_source_state.to_string());
        }
        if let Some(data_source_configuration) = &data_source.data_source_configuration() {
            updates
                .push("data_source_configuration = ")
                .push_bind(data_source_configuration.to_string());
        }
        if let Some(data_source_description) = &data_source.description() {
            updates
                .push("data_source_description = ")
                .push_bind(data_source_description.to_string());
        }
        if let Some(source_type) = &data_source.source_type() {
            updates
                .push("source_type = ")
                .push_bind(source_type.to_string());
        }
        updates
            .push("updated_at = ")
            .push_bind(Utc::now().to_rfc3339());
        drop(updates);
        query.push(" WHERE id = ");
        query.push_bind(pipeline_id_to_database(data_source_id.id()));
        query.push(" AND organization_id = ");
        query.push_bind(org_id);
        query
            .build()
            .execute(pool)
            .await
            .map_err(|e| PipelinePersistenceError::Database {
                reason: e.to_string(),
            })?;

        Ok(())
    }

    async fn update_pipeline_data_source_name(
        &self,
        org_id: i64,
        data_source_id: &DataStoreId,
        name: &FieldName,
    ) -> Result<(), IoTBeeError> {
        // Implementation to update the pipeline data source name in the database
        let pool = self.data_base_connection().pool();
        sqlx::query(
            r#"
            UPDATE data_sources
            SET name = $1, updated_at = $2
            WHERE id = $3 AND organization_id = $4
            "#,
        )
        .bind(name.name())
        .bind(Utc::now().to_rfc3339())
        .bind(pipeline_id_to_database(data_source_id.id()))
        .bind(org_id)
        .execute(pool)
        .await
        .map_err(|e| PipelinePersistenceError::Database {
            reason: e.to_string(),
        })?;
        Ok(())
    }

    async fn delete_pipeline_data_source(
        &self,
        org_id: i64,
        data_source_id: &DataStoreId,
    ) -> Result<(), IoTBeeError> {
        // Implementation to delete the pipeline data source from the database
        let pool = self.data_base_connection().pool();
        let result = sqlx::query(
            r#"
            DELETE FROM data_sources
            WHERE id = $1 AND organization_id = $2
            "#,
        )
        .bind(pipeline_id_to_database(data_source_id.id()))
        .bind(org_id)
        .execute(pool)
        .await
        .map_err(|e| PipelinePersistenceError::Database {
            reason: e.to_string(),
        })?;

        if result.rows_affected() == 0 {
            return Err(IoTBeeError::from(PipelinePersistenceError::IdNotFound {
                id: data_source_id.id(),
            }));
        }

        Ok(())
    }
    async fn get_pipelines_using_data_source(
        &self,
        org_id: i64,
        data_source_id: &DataStoreId,
    ) -> Result<Vec<DataStoreId>, IoTBeeError> {
        // Implementation to get the pipelines that are using a specific data source from the database
        let pool = self.data_base_connection().pool();
        let rows = sqlx::query(
            r#"
            SELECT id
            FROM pipelines
            WHERE data_source_id = $1 AND organization_id = $2
            "#,
        )
        .bind(pipeline_id_to_database(data_source_id.id()))
        .bind(org_id)
        .fetch_all(pool)
        .await
        .map_err(|e| PipelinePersistenceError::Database {
            reason: e.to_string(),
        })?;
        let pipeline_ids = rows
            .into_iter()
            .map(|row| -> Result<DataStoreId, IoTBeeError> {
                let pipeline_id: i64 =
                    row.try_get("id")
                        .map_err(|e| PipelinePersistenceError::Database {
                            reason: e.to_string(),
                        })?;
                DataStoreId::new(database_id_to_pipeline(pipeline_id)?)
            })
            .collect::<Result<Vec<_>, _>>()?;
        Ok(pipeline_ids)
    }
}
