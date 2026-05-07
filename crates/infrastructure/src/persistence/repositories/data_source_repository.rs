//domain imports
use domain::entities::data_source::{
    PipelineDataSourceInputModel, PipelineDataSourceOutputModel, PipelineDataSourceUpdateModel,
};
use domain::error::IoTBeeError;
use domain::outbound::pipeline_persistence::PipelineDataSourceRepository;
//crate imports
use domain::error::PipelinePersistenceError;
use domain::value_objects::pipelines_values::{DataStoreId, FieldName};
use crate::persistence::connection::InternalDataBase;
use crate::persistence::models::DataSourceRow;

use async_trait::async_trait;
use chrono::Utc;
use sqlx::Error as SqlxError;
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
        data_source: &PipelineDataSourceInputModel,
    ) -> Result<(), IoTBeeError> {
        let pool = self.data_base_connection().pool();

        let result = sqlx::query(
                r#"
                INSERT INTO data_sources (name, source_type, data_source_configuration, data_source_description, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(data_source.name())
            .bind(data_source.source_type())
            .bind(data_source.data_source_configuration())
            .bind(data_source.description())
            .bind(Utc::now().to_rfc3339())
            .bind(Utc::now().to_rfc3339())
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
        data_source_id: &DataStoreId,
    ) -> Result<Option<PipelineDataSourceOutputModel>, IoTBeeError> {
        // Implementation to get the pipeline data source from the database
        let pool = self.data_base_connection().pool();
        let result = sqlx::query_as::<_, DataSourceRow>(
            r#"
            SELECT id, name, data_source_state, data_source_configuration, data_source_description, source_type, created_at, updated_at
            FROM data_sources
            WHERE id = ?
            "#,
        )
        .bind(&data_source_id.id())
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
    ) -> Result<Vec<PipelineDataSourceOutputModel>, IoTBeeError> {
        // Implementation to list all pipeline data sources from the database
        let pool = self.data_base_connection().pool();
        let rows = sqlx::query_as::<_, DataSourceRow>(
            r#"
            SELECT id, name, data_source_state, data_source_configuration, data_source_description, source_type, created_at, updated_at
            FROM data_sources
            "#,
        )
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
        data_source_id: &DataStoreId,
        data_source: &PipelineDataSourceUpdateModel,
    ) -> Result<(), IoTBeeError> {
        // Implementation to update the pipeline data source in the database
        let pool = self.data_base_connection().pool();
        //validar de data source que campos estan none y solo actuliar los campos que tengan contenido
        let mut query: String = String::from("UPDATE data_sources SET ");
        let mut params: Vec<(String, String)> = Vec::new();

        if let Some(data_source_state) = &data_source.data_source_state() {
            query.push_str("data_source_state = ?, ");
            params.push((
                "data_source_state".to_string(),
                data_source_state.to_string(),
            ));
        }
        if let Some(data_source_configuration) = &data_source.data_source_configuration() {
            query.push_str("data_source_configuration = ?, ");
            params.push((
                "data_source_configuration".to_string(),
                data_source_configuration.to_string(),
            ));
        }
        if let Some(data_source_description) = &data_source.description() {
            query.push_str("data_source_description = ?, ");
            params.push((
                "data_source_description".to_string(),
                data_source_description.to_string(),
            ));
        }
        if let Some(source_type) = &data_source.source_type() {
            query.push_str("source_type = ?, ");
            params.push(("source_type".to_string(), source_type.to_string()));
        }
        query.push_str("updated_at = ? WHERE id = ?");
        let mut sql_query = sqlx::query(&query);
        for param in params {
            sql_query = sql_query.bind(param.1);
        }
        sql_query = sql_query
            .bind(Utc::now().to_rfc3339())
            .bind(data_source_id.id());
        sql_query
            .execute(pool)
            .await
            .map_err(|e| PipelinePersistenceError::Database {
                reason: e.to_string(),
            })?;

        Ok(())
    }

    async fn update_pipeline_data_source_name(
        &self,
        data_source_id: &DataStoreId,
        name: &FieldName,
    ) -> Result<(), IoTBeeError> {
        // Implementation to update the pipeline data source name in the database
        let pool = self.data_base_connection().pool();
        sqlx::query(
            r#"
            UPDATE data_sources
            SET name = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(name.name())
        .bind(Utc::now().to_rfc3339())
        .bind(&data_source_id.id())
        .execute(pool)
        .await
        .map_err(|e| PipelinePersistenceError::Database {
            reason: e.to_string(),
        })?;
        Ok(())
    }
}
