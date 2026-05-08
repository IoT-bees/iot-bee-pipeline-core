use async_trait::async_trait;
use domain::entities::pipeline_groups::{PipelineGroupInputModel, PipelineGroupOutputModel};
use domain::error::{IoTBeeError, PipelinePersistenceError};
use domain::outbound::pipeline_persistence::PipelineGroupRepository;
use domain::value_objects::pipelines_values::DataStoreId;
use logging::AppLogger;
use std::sync::Arc;

static LOGGER: AppLogger = AppLogger::new("iot_bee::application::groups_cases::cases");

#[async_trait]
pub trait PipelineGroupUseCases {
    //with life time anotations
    async fn create_pipeline_group(
        &self,
        group_name: &str,
        group_description: &str,
    ) -> Result<(), IoTBeeError>;

    async fn get_pipeline_groups(&self) -> Result<Vec<PipelineGroupOutputModel>, IoTBeeError>;
    async fn get_pipeline_group_by_id(
        &self,
        group_id: &u32,
    ) -> Result<PipelineGroupOutputModel, IoTBeeError>;
    async fn delete_pipeline_group(&self, group_id: &u32) -> Result<(), IoTBeeError>;
}

pub struct PipelineGroupUseCasesImpl<T: PipelineGroupRepository + Send + Sync> {
    repository: Arc<T>,
}
impl<T: PipelineGroupRepository + Send + Sync> PipelineGroupUseCasesImpl<T> {
    pub fn new(repository: Arc<T>) -> Self {
        Self { repository }
    }
}

#[async_trait]
impl<T> PipelineGroupUseCases for PipelineGroupUseCasesImpl<T>
where
    T: PipelineGroupRepository + Send + Sync,
{
    async fn create_pipeline_group(
        &self,
        group_name: &str,
        group_description: &str,
    ) -> Result<(), IoTBeeError> {
        LOGGER.debug(&format!(
            "create_pipeline_group use case called for name='{group_name}'"
        ));
        let group_input = PipelineGroupInputModel::new(group_name, group_description)?;
        self.repository
            .save_pipeline_group(&group_input)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to create pipeline group '{group_name}': {e}"
                ));
                e
            })
    }

    async fn get_pipeline_groups(&self) -> Result<Vec<PipelineGroupOutputModel>, IoTBeeError> {
        LOGGER.debug("get_pipeline_groups use case called");
        let result = self.repository.get_pipeline_group().await.map_err(|e| {
            LOGGER.error(&format!("Failed to get pipeline groups: {e}"));
            e
        })?;
        LOGGER.info(&format!("Found {} pipeline groups", result.len()));
        Ok(result)
    }

    async fn get_pipeline_group_by_id(
        &self,
        group_id: &u32,
    ) -> Result<PipelineGroupOutputModel, IoTBeeError> {
        LOGGER.debug(&format!(
            "get_pipeline_group_by_id use case called for id={group_id}"
        ));
        let group_id = DataStoreId::new(*group_id)?;
        let result = self
            .repository
            .get_pipeline_group_by_id(&group_id)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to get pipeline group id={}: {e}",
                    group_id.id()
                ));
                e
            })?;

        if let Some(group) = result {
            Ok(group)
        } else {
            LOGGER.warn(&format!("Pipeline group id={} not found", group_id.id()));
            Err(PipelinePersistenceError::IdNotFound { id: group_id.id() }.into())
        }
    }
    async fn delete_pipeline_group(&self, group_id: &u32) -> Result<(), IoTBeeError> {
        LOGGER.debug(&format!(
            "delete_pipeline_group use case called for id={group_id}"
        ));
        let group_id = DataStoreId::new(*group_id)?;

        let pipelines_using_group = self
            .repository
            .get_pipelines_using_group(&group_id)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to get pipelines using group id={}: {e}",
                    group_id.id()
                ));
                e
            })?;

        if !pipelines_using_group.is_empty() {
            LOGGER.warn(&format!(
                "Cannot delete pipeline group id={} because it is used by {:?} pipelines",
                group_id.id(),
                pipelines_using_group.iter().map(|id| id.id()).collect::<Vec<u32>>()
            ));
            return Err(PipelinePersistenceError::DeleteFailed { reason: format!("Cannot delete pipeline group id={} because it is used by {:?} pipelines", group_id.id(), pipelines_using_group.iter().map(|id| id.id()).collect::<Vec<u32>>()) }.into());
        }

        self.repository
            .delete_pipeline_group(&group_id)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to delete pipeline group id={}: {e}",
                    group_id.id()
                ));
                e
            })
    }
}

