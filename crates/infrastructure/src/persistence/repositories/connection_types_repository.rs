use domain::outbound::pipeline_persistence::PipelineConnectionTypeRepository;
// use domain::outbound::PipelineGeneralRepository;
use async_trait::async_trait;
use domain::entities::connection_type::ConnectionTypeModel;
use domain::error::{IoTBeeError, PipelinePersistenceError};

use crate::persistence::models::ConnectionTypeRow;
// use sqlx::Error as SqlxError;
use crate::persistence::connection::InternalDataBase;
use std::sync::Arc;
pub struct ConnectionTypesRepository {
    pipeline_store_repository: Arc<InternalDataBase>,
}
impl ConnectionTypesRepository {
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
impl PipelineConnectionTypeRepository for ConnectionTypesRepository {
    async fn get_pipeline_connection_type(&self) -> Result<Vec<ConnectionTypeModel>, IoTBeeError> {
        // Implementation to get the pipeline connection type from the database
        let pool = self.data_base_connection().pool();
        let result = sqlx::query_as::<_, ConnectionTypeRow>(
            r#"
            SELECT id, connection_type FROM connection_types
            "#,
        )
        .fetch_all(pool)
        .await
        .map_err(|e| PipelinePersistenceError::Database {
            reason: e.to_string(),
        })?;

        let connection_types: Vec<ConnectionTypeModel> = result
            .into_iter()
            .map(|row| ConnectionTypeModel::try_from(row))
            .collect::<Result<Vec<_>, _>>()?;

        Ok(connection_types)
    }
}
