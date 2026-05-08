use domain::entities::data_source::{
    PipelineDataSourceInputModel, PipelineDataSourceOutputModel, PipelineDataSourceUpdateModel,
};
use domain::value_objects::pipelines_values::{DataStoreId, FieldName};

use async_trait::async_trait;
use domain::error::{IoTBeeError, PipelinePersistenceError};
use domain::outbound::pipeline_persistence::PipelineDataSourceRepository;
use logging::AppLogger;
use std::sync::Arc;

static LOGGER: AppLogger = AppLogger::new("iot_bee::application::data_sources_cases::cases");

#[async_trait]
pub trait DataSourcesUseCases {
    async fn create_data_source(
        &self,
        data_source: &PipelineDataSourceInputModel,
    ) -> Result<(), IoTBeeError>;
    // async fn delete_data_source(&self) -> Result<(), IoTBeeError>;
    async fn update_data_source(
        &self,
        data_source_id: &u32,
        data: &PipelineDataSourceUpdateModel,
    ) -> Result<(), IoTBeeError>;
    async fn update_data_source_name(
        &self,
        data_source_id: &u32,
        new_name: &str,
    ) -> Result<(), IoTBeeError>;
    async fn get_data_source(
        &self,
        data_source_id: &u32,
    ) -> Result<PipelineDataSourceOutputModel, IoTBeeError>;
    async fn list_data_sources(&self) -> Result<Vec<PipelineDataSourceOutputModel>, IoTBeeError>;

    //Caso de eliminar un data source que esta siendo usado por un pipeline:
    async fn delete_data_source(&self, data_source_id: &u32) -> Result<(), IoTBeeError>;
}

pub struct DataSourcesUseCasesImpl<T: PipelineDataSourceRepository + Send + Sync> {
    repository: Arc<T>,
}
impl<T: PipelineDataSourceRepository + Send + Sync> DataSourcesUseCasesImpl<T> {
    pub fn new(repository: Arc<T>) -> Self {
        Self { repository }
    }
}

#[async_trait]
impl<T> DataSourcesUseCases for DataSourcesUseCasesImpl<T>
where
    T: PipelineDataSourceRepository + Send + Sync,
{
    async fn create_data_source(
        &self,
        data_source: &PipelineDataSourceInputModel,
    ) -> Result<(), IoTBeeError> {
        LOGGER.debug("create_data_source use case called");
        self.repository
            .save_pipeline_data_source(data_source)
            .await
            .map_err(|e| {
                LOGGER.error(&format!("Failed to save data source: {e}"));
                e
            })
    }
    async fn get_data_source(
        &self,
        data_source_id: &u32,
    ) -> Result<PipelineDataSourceOutputModel, IoTBeeError> {
        LOGGER.debug(&format!(
            "get_data_source use case called for id={data_source_id}"
        ));

        let data_source_id = DataStoreId::new(*data_source_id)?;
        let result = self
            .repository
            .get_pipeline_data_source(&data_source_id)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to get data source id={}: {e}",
                    data_source_id.id()
                ));
                e
            })?;

        if result.is_none() {
            LOGGER.warn(&format!("Data source id={} not found", data_source_id.id()));
            return Err(PipelinePersistenceError::IdNotFound {
                id: data_source_id.id(),
            }
            .into());
        }

        Ok(result.unwrap())
    }
    async fn list_data_sources(&self) -> Result<Vec<PipelineDataSourceOutputModel>, IoTBeeError> {
        LOGGER.debug("list_data_sources use case called");
        let result = self
            .repository
            .list_pipeline_data_source()
            .await
            .map_err(|e| {
                LOGGER.error(&format!("Failed to list data sources: {e}"));
                e
            })?;
        LOGGER.info(&format!("Found {} data sources", result.len()));
        Ok(result)
    }

    async fn update_data_source(
        &self,
        data_source_id: &u32,
        data: &PipelineDataSourceUpdateModel,
    ) -> Result<(), IoTBeeError> {
        LOGGER.debug(&format!(
            "update_data_source use case called for id={data_source_id}"
        ));
        let data_source_id = DataStoreId::new(*data_source_id)?;
        let update_result = self
            .repository
            .update_pipeline_data_source(&data_source_id, data)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to update data source id={}: {e}",
                    data_source_id.id()
                ));
                e
            })?;
        LOGGER.info(&format!(
            "Data source id={} updated successfully",
            data_source_id.id()
        ));
        //TODO: Crear aca la logica de reiniciar los pipelines que usen esta data source,
        Ok(update_result)
    }
    async fn update_data_source_name(
        &self,
        data_source_id: &u32,
        new_name: &str,
    ) -> Result<(), IoTBeeError> {
        LOGGER.debug(&format!(
            "update_data_source_name use case called for id={data_source_id}"
        ));
        let data_source_id = DataStoreId::new(*data_source_id)?;
        let field_name = FieldName::new(new_name)?;
        self.repository
            .update_pipeline_data_source_name(&data_source_id, &field_name)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to update data source name id={}: {e}",
                    data_source_id.id()
                ));
                e
            })
    }

    async fn delete_data_source(&self, _data_source_id: &u32) -> Result<(), IoTBeeError> {
        // para poder eliminar un data source primero validar que el data source no este relacionado a un pipeline, si esta relacionado a un pipeline, lanzar un error indicando que no se puede eliminar el data source porque esta siendo usado por un pipeline, y listar los pipelines que estan usando ese data source.
        let data_source_id = DataStoreId::new(*_data_source_id)?;
        let pipelines_using_data_source = self.repository.get_pipelines_using_data_source(&data_source_id).await.map_err(|e| {
            LOGGER.error(&format!(
                "Failed to check pipelines using data source id={}: {e}",
                data_source_id.id()
            ));
            e
        })?;

        if !pipelines_using_data_source.is_empty() {
            LOGGER.warn(&format!(
                "Cannot delete data source id={} because it is being used by pipelines: {:?}",
                data_source_id.id(),
                pipelines_using_data_source.iter().map(|id| id.id()).collect::<Vec<u32>>()
            ));
            return Err(PipelinePersistenceError::DeleteFailed { reason: format!(
                "Cannot delete data source id={} because it is being used by pipelines: {:?}",
                data_source_id.id(),
                pipelines_using_data_source.iter().map(|id| id.id()).collect::<Vec<u32>>()
            ) }.into());
        }

        self.repository.delete_pipeline_data_source(&data_source_id).await.map_err(|e| {
            LOGGER.error(&format!(
                "Failed to delete data source id={}: {e}",
                data_source_id.id()
            ));
            e
        })?;
        LOGGER.info(&format!("Data source id={} deleted successfully", data_source_id.id()));

        Ok(())
    }
}
