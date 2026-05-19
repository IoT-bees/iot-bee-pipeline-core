use domain::entities::data_store::{PipelineDataStoreInputModel, PipelineDataStoreOutputModel};
use domain::outbound::pipeline_persistence::PipelineDataStoreRepository;
use domain::value_objects::pipelines_values::DataStoreId;

use async_trait::async_trait;
use domain::error::{IoTBeeError, PipelinePersistenceError};
use logging::AppLogger;
use std::sync::Arc;

static LOGGER: AppLogger = AppLogger::new("iot_bee::application::data_store_cases::cases");

#[async_trait]
pub trait DataStoreUseCases {
    async fn create_data_store(
        &self,
        data_store: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError>;
    async fn get_data_store(&self) -> Result<Vec<PipelineDataStoreOutputModel>, IoTBeeError>;
    async fn get_data_store_by_id(
        &self,
        data_store_id: &u32,
    ) -> Result<PipelineDataStoreOutputModel, IoTBeeError>;
    async fn update_data_store_configuration(
        &self,
        data_store_id: &u32,
        new_config: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError>;
    async fn delete_data_store(&self, data_store_id: &u32) -> Result<(), IoTBeeError>;
}

pub struct DataStoreUseCasesImpl<T: PipelineDataStoreRepository + Send + Sync> {
    repository: Arc<T>,
}

impl<T: PipelineDataStoreRepository + Send + Sync> DataStoreUseCasesImpl<T> {
    pub fn new(repository: Arc<T>) -> Self {
        Self { repository }
    }
}

#[async_trait]
impl<T> DataStoreUseCases for DataStoreUseCasesImpl<T>
where
    T: PipelineDataStoreRepository + Send + Sync,
{
    async fn create_data_store(
        &self,
        data_store: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError> {
        self.repository.save_pipeline_data_store(data_store).await
    }
    async fn get_data_store(&self) -> Result<Vec<PipelineDataStoreOutputModel>, IoTBeeError> {
        LOGGER.debug("get data stores use case called");
        self.repository.get_pipeline_data_store().await
    }
    async fn get_data_store_by_id(
        &self,
        data_store_id: &u32,
    ) -> Result<PipelineDataStoreOutputModel, IoTBeeError> {
        let data_store_id = DataStoreId::new(*data_store_id)?;
        let result = self
            .repository
            .get_pipeline_data_store_by_id(&data_store_id)
            .await?;

        if let Some(group) = result {
            Ok(group)
        } else {
            Err(PipelinePersistenceError::IdNotFound {
                id: data_store_id.id(),
            }
            .into())
        }
    }
    async fn update_data_store_configuration(
        &self,
        data_store_id: &u32,
        new_config: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError> {
        let data_store_id = DataStoreId::new(*data_store_id)?;
        let existing_data_store = self
            .repository
            .get_pipeline_data_store_by_id(&data_store_id)
            .await?;

        if existing_data_store.is_none() {
            return Err(PipelinePersistenceError::IdNotFound {
                id: data_store_id.id(),
            }
            .into());
        }

        self.repository
            .update_pipeline_data_store_configuration(&data_store_id, new_config)
            .await
    }
    async fn delete_data_store(&self, data_store_id: &u32) -> Result<(), IoTBeeError> {
        let data_store_id = DataStoreId::new(*data_store_id)?;
        let existing_data_store = self
            .repository
            .get_pipeline_data_store_by_id(&data_store_id)
            .await?;

        if existing_data_store.is_none() {
            return Err(PipelinePersistenceError::IdNotFound {
                id: data_store_id.id(),
            }
            .into());
        }

        self.repository
            .delete_pipeline_data_store(&data_store_id)
            .await
    }
}
