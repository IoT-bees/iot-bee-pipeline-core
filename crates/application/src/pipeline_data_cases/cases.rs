use async_trait::async_trait;
use domain::entities::pipeline_data::{PipelineDataInputModel, PipelineDataOutputModel};
use domain::error::{IoTBeeError, PipelinePersistenceError};
use domain::outbound::pipeline_persistence::PipelineControllerRepository;
use domain::value_objects::pipelines_values::DataStoreId;
use logging::AppLogger;
use std::sync::Arc;

static LOGGER: AppLogger = AppLogger::new("iot_bee::application::pipeline_data_cases::cases");

#[async_trait]
pub trait PipelineDataUseCases {
    async fn create_pipeline(&self, pipeline: &PipelineDataInputModel) -> Result<(), IoTBeeError>;
    async fn get_pipeline(&self) -> Result<Vec<PipelineDataOutputModel>, IoTBeeError>;
    async fn get_pipeline_by_id(
        &self,
        pipeline_id: &u32,
    ) -> Result<PipelineDataOutputModel, IoTBeeError>;
    async fn delete_pipeline_by_id(&self, pipeline_id: &u32) -> Result<(), IoTBeeError>;
}

pub struct PipelineDataUseCasesImpl<T: PipelineControllerRepository + Send + Sync> {
    repository: Arc<T>,
}
impl<T: PipelineControllerRepository + Send + Sync> PipelineDataUseCasesImpl<T> {
    pub fn new(repository: Arc<T>) -> Self {
        Self { repository }
    }
}

#[async_trait]
impl<T> PipelineDataUseCases for PipelineDataUseCasesImpl<T>
where
    T: PipelineControllerRepository + Send + Sync,
{
    async fn create_pipeline(&self, pipeline: &PipelineDataInputModel) -> Result<(), IoTBeeError> {
        LOGGER.debug("create_pipeline use case called");
        self.repository.save_pipeline(pipeline).await.map_err(|e| {
            LOGGER.error(&format!("Failed to save pipeline: {e}"));
            e
        })
    }
    async fn get_pipeline(&self) -> Result<Vec<PipelineDataOutputModel>, IoTBeeError> {
        LOGGER.debug("get_pipeline use case called");
        let result = self.repository.get_pipeline().await.map_err(|e| {
            LOGGER.error(&format!("Failed to get pipelines: {e}"));
            e
        })?;
        LOGGER.info(&format!("Found {} pipelines", result.len()));
        Ok(result)
    }
    async fn get_pipeline_by_id(
        &self,
        pipeline_id: &u32,
    ) -> Result<PipelineDataOutputModel, IoTBeeError> {
        LOGGER.debug(&format!(
            "get_pipeline_by_id use case called for id={pipeline_id}"
        ));
        let pipeline_id = DataStoreId::new(*pipeline_id)?;
        let result = self
            .repository
            .get_pipeline_by_id(&pipeline_id)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to get pipeline id={}: {e}",
                    pipeline_id.id()
                ));
                e
            })?;

        match result {
            Some(pipeline) => Ok(pipeline),
            None => {
                LOGGER.warn(&format!("Pipeline id={} not found", pipeline_id.id()));
                Err(PipelinePersistenceError::IdNotFound {
                    id: pipeline_id.id(),
                }
                .into())
            }
        }
    }

    async fn delete_pipeline_by_id(&self, pipeline_id: &u32) -> Result<(), IoTBeeError> {
        LOGGER.debug(&format!(
            "delete_pipeline_by_id use case called for id={pipeline_id}"
        ));
        let pipeline_id = DataStoreId::new(*pipeline_id)?;
        let pipeline_state = self.repository.get_pipeline_by_id(&pipeline_id).await.map_err(|e| {
            LOGGER.error(&format!(
                "Failed to get pipeline id={} before deletion: {e}",
                pipeline_id.id()
            ));
            e
        })?
        .ok_or_else(|| {
            LOGGER.warn(&format!("Pipeline id={} not found before deletion", pipeline_id.id()));
            PipelinePersistenceError::IdNotFound {
                id: pipeline_id.id(),
            }
        })?;

        if pipeline_state.is_active() {
            LOGGER.warn(&format!("Pipeline id={} is active before deletion, stopping it first", pipeline_id.id()));
            return Err(PipelinePersistenceError::DeleteFailed { reason: format!("Pipeline id={} is active before deletion", pipeline_id.id()) }.into());      
        }


        self.repository.delete_pipeline_by_id(&pipeline_id).await.map_err(|e| {
            LOGGER.error(&format!(
                "Failed to delete pipeline id={}: {e}",
                pipeline_id.id()
            ));
            e
        })?;
        LOGGER.info(&format!("Pipeline id={} deleted successfully", pipeline_id.id()));
        Ok(())
    }

}
