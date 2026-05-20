use crate::license_cases::cases::effective_limits;
use async_trait::async_trait;
use domain::entities::pipeline_data::{PipelineDataInputModel, PipelineDataOutputModel};
use domain::error::{IoTBeeError, LicenseError, PipelinePersistenceError};
use domain::outbound::license_repository::LicenseRepository;
use domain::outbound::pipeline_persistence::PipelineControllerRepository;
use domain::plan::outbound::plan_repository::PlanRepository;
use domain::value_objects::pipelines_values::DataStoreId;
use logging::AppLogger;
use std::sync::Arc;

static LOGGER: AppLogger = AppLogger::new("iot_bee::application::pipeline_data_cases::cases");

#[async_trait]
pub trait PipelineDataUseCases {
    async fn create_pipeline(
        &self,
        org_id: i64,
        pipeline: &PipelineDataInputModel,
    ) -> Result<(), IoTBeeError>;
    async fn get_pipeline(&self, org_id: i64) -> Result<Vec<PipelineDataOutputModel>, IoTBeeError>;
    async fn get_pipeline_by_id(
        &self,
        org_id: i64,
        pipeline_id: &u32,
    ) -> Result<PipelineDataOutputModel, IoTBeeError>;
    async fn delete_pipeline_by_id(
        &self,
        org_id: i64,
        pipeline_id: &u32,
    ) -> Result<(), IoTBeeError>;
    async fn get_pipeline_by_group_id(
        &self,
        org_id: i64,
        group_id: &u32,
    ) -> Result<Vec<PipelineDataOutputModel>, IoTBeeError>;
    async fn update_data_source(
        &self,
        org_id: i64,
        pipeline_id: &u32,
        data_source_id: &u32,
    ) -> Result<(), IoTBeeError>;
    async fn update_store_data_source(
        &self,
        org_id: i64,
        pipeline_id: &u32,
        data_store_id: &u32,
    ) -> Result<(), IoTBeeError>;
    async fn update_validation_schema(
        &self,
        org_id: i64,
        pipeline_id: &u32,
        validation_schema_id: &u32,
    ) -> Result<(), IoTBeeError>;
    async fn update_group(
        &self,
        org_id: i64,
        pipeline_id: &u32,
        group_id: &u32,
    ) -> Result<(), IoTBeeError>;
    async fn update_replication_factor(
        &self,
        org_id: i64,
        pipeline_id: &u32,
        replication_factor: &u32,
    ) -> Result<(), IoTBeeError>;
}

pub struct PipelineDataUseCasesImpl<
    T: PipelineControllerRepository + Send + Sync,
    U: LicenseRepository + Send + Sync,
> {
    repository: Arc<T>,
    license_repository: Arc<U>,
    plan_repository: Arc<dyn PlanRepository>,
}
impl<T, U> PipelineDataUseCasesImpl<T, U>
where
    T: PipelineControllerRepository + Send + Sync,
    U: LicenseRepository + Send + Sync,
{
    pub fn new(
        repository: Arc<T>,
        license_repository: Arc<U>,
        plan_repository: Arc<dyn PlanRepository>,
    ) -> Self {
        Self {
            repository,
            license_repository,
            plan_repository,
        }
    }
}

#[async_trait]
impl<T, U> PipelineDataUseCases for PipelineDataUseCasesImpl<T, U>
where
    T: PipelineControllerRepository + Send + Sync,
    U: LicenseRepository + Send + Sync,
{
    async fn create_pipeline(
        &self,
        org_id: i64,
        pipeline: &PipelineDataInputModel,
    ) -> Result<(), IoTBeeError> {
        LOGGER.debug("create_pipeline use case called");
        let limits = effective_limits(
            self.license_repository.as_ref(),
            self.plan_repository.as_ref(),
            org_id,
        )
        .await?
        .limits;
        if let Some(sub) = self.license_repository.get_subscription().await? {
            if sub.is_restricted() {
                return Err(LicenseError::LimitExceeded {
                    reason: "your last payment failed; update your card to keep creating pipelines"
                        .into(),
                }
                .into());
            }
        }
        let current_count = self.repository.count_pipelines(org_id).await?;
        if current_count >= limits.max_pipelines {
            return Err(LicenseError::LimitExceeded {
                reason: format!(
                    "your current plan allows {} pipelines; upgrade your license to create more",
                    limits.max_pipelines
                ),
            }
            .into());
        }
        if pipeline.pipeline_replication() > limits.max_replicas_per_pipeline {
            return Err(LicenseError::LimitExceeded {
                reason: format!(
                    "your current plan allows up to {} replicas per pipeline",
                    limits.max_replicas_per_pipeline
                ),
            }
            .into());
        }
        self.repository
            .save_pipeline(org_id, pipeline)
            .await
            .map_err(|e| {
                LOGGER.error(&format!("Failed to save pipeline: {e}"));
                e
            })
    }
    async fn get_pipeline(&self, org_id: i64) -> Result<Vec<PipelineDataOutputModel>, IoTBeeError> {
        LOGGER.debug("get_pipeline use case called");
        let result = self.repository.get_pipeline(org_id).await.map_err(|e| {
            LOGGER.error(&format!("Failed to get pipelines: {e}"));
            e
        })?;
        LOGGER.info(&format!("Found {} pipelines", result.len()));
        Ok(result)
    }
    async fn get_pipeline_by_id(
        &self,
        org_id: i64,
        pipeline_id: &u32,
    ) -> Result<PipelineDataOutputModel, IoTBeeError> {
        LOGGER.debug(&format!(
            "get_pipeline_by_id use case called for id={pipeline_id}"
        ));
        let pipeline_id = DataStoreId::new(*pipeline_id)?;
        let result = self
            .repository
            .get_pipeline_by_id(org_id, &pipeline_id)
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

    async fn delete_pipeline_by_id(
        &self,
        org_id: i64,
        pipeline_id: &u32,
    ) -> Result<(), IoTBeeError> {
        LOGGER.debug(&format!(
            "delete_pipeline_by_id use case called for id={pipeline_id}"
        ));
        let pipeline_id = DataStoreId::new(*pipeline_id)?;
        let pipeline_state = self
            .repository
            .get_pipeline_by_id(org_id, &pipeline_id)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to get pipeline id={} before deletion: {e}",
                    pipeline_id.id()
                ));
                e
            })?
            .ok_or_else(|| {
                LOGGER.warn(&format!(
                    "Pipeline id={} not found before deletion",
                    pipeline_id.id()
                ));
                PipelinePersistenceError::IdNotFound {
                    id: pipeline_id.id(),
                }
            })?;

        if pipeline_state.is_active() {
            LOGGER.warn(&format!(
                "Pipeline id={} is active before deletion, stopping it first",
                pipeline_id.id()
            ));
            return Err(PipelinePersistenceError::DeleteFailed {
                reason: format!("Pipeline id={} is active before deletion", pipeline_id.id()),
            }
            .into());
        }

        self.repository
            .delete_pipeline_by_id(org_id, &pipeline_id)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to delete pipeline id={}: {e}",
                    pipeline_id.id()
                ));
                e
            })?;
        LOGGER.info(&format!(
            "Pipeline id={} deleted successfully",
            pipeline_id.id()
        ));
        Ok(())
    }

    async fn get_pipeline_by_group_id(
        &self,
        org_id: i64,
        group_id: &u32,
    ) -> Result<Vec<PipelineDataOutputModel>, IoTBeeError> {
        LOGGER.debug(&format!(
            "get_pipeline_by_group_id use case called for group_id={group_id}"
        ));
        let result = self
            .repository
            .get_pipeline_by_group_id(org_id, &DataStoreId::new(*group_id)?)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to get pipelines for group id={}: {e}",
                    group_id
                ));
                e
            })?;
        LOGGER.info(&format!(
            "Found {} pipelines for group id={}",
            result.len(),
            group_id
        ));
        Ok(result)
    }

    async fn update_data_source(
        &self,
        org_id: i64,
        pipeline_id: &u32,
        data_source_id: &u32,
    ) -> Result<(), IoTBeeError> {
        LOGGER.debug(&format!(
            "update_data_source use case called for pipeline_id={} and data_source_id={}",
            pipeline_id, data_source_id
        ));
        let pipeline_id = DataStoreId::new(*pipeline_id)?;
        let data_source_id = DataStoreId::new(*data_source_id)?;
        self.repository
            .update_pipeline_data_source(org_id, &pipeline_id, &data_source_id)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to update pipeline id={} with data source id={}: {e}",
                    pipeline_id.id(),
                    data_source_id.id()
                ));
                e
            })?;
        LOGGER.info(&format!(
            "Pipeline id={} updated with data source id={} successfully",
            pipeline_id.id(),
            data_source_id.id()
        ));
        Ok(())
    }

    async fn update_store_data_source(
        &self,
        org_id: i64,
        pipeline_id: &u32,
        data_store_id: &u32,
    ) -> Result<(), IoTBeeError> {
        LOGGER.debug(&format!(
            "update_store_data_source use case called for pipeline_id={} and data_store_id={}",
            pipeline_id, data_store_id
        ));
        let pipeline_id = DataStoreId::new(*pipeline_id)?;
        let data_store_id = DataStoreId::new(*data_store_id)?;
        self.repository
            .update_pipeline_data_store(org_id, &pipeline_id, &data_store_id)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to update pipeline id={} with data store id={}: {e}",
                    pipeline_id.id(),
                    data_store_id.id()
                ));
                e
            })?;
        LOGGER.info(&format!(
            "Pipeline id={} updated with data store id={} successfully",
            pipeline_id.id(),
            data_store_id.id()
        ));
        Ok(())
    }
    async fn update_validation_schema(
        &self,
        org_id: i64,
        pipeline_id: &u32,
        validation_schema_id: &u32,
    ) -> Result<(), IoTBeeError> {
        LOGGER.debug(&format!(
            "update_validation_schema use case called for pipeline_id={} and validation_schema_id={}",
            pipeline_id, validation_schema_id
        ));
        let pipeline_id = DataStoreId::new(*pipeline_id)?;
        let validation_schema_id = DataStoreId::new(*validation_schema_id)?;
        self.repository
            .update_pipeline_validation_schema(org_id, &pipeline_id, &validation_schema_id)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to update pipeline id={} with validation schema id={}: {e}",
                    pipeline_id.id(),
                    validation_schema_id.id()
                ));
                e
            })?;
        LOGGER.info(&format!(
            "Pipeline id={} updated with validation schema id={} successfully",
            pipeline_id.id(),
            validation_schema_id.id()
        ));
        Ok(())
    }
    async fn update_group(
        &self,
        org_id: i64,
        pipeline_id: &u32,
        group_id: &u32,
    ) -> Result<(), IoTBeeError> {
        LOGGER.debug(&format!(
            "update_group use case called for pipeline_id={} and group_id={}",
            pipeline_id, group_id
        ));
        let pipeline_id = DataStoreId::new(*pipeline_id)?;
        let group_id = DataStoreId::new(*group_id)?;
        self.repository
            .update_pipeline_group(org_id, &pipeline_id, &group_id)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to update pipeline id={} with group id={}: {e}",
                    pipeline_id.id(),
                    group_id.id()
                ));
                e
            })?;
        LOGGER.info(&format!(
            "Pipeline id={} updated with group id={} successfully",
            pipeline_id.id(),
            group_id.id()
        ));
        Ok(())
    }

    async fn update_replication_factor(
        &self,
        org_id: i64,
        pipeline_id: &u32,
        replication_factor: &u32,
    ) -> Result<(), IoTBeeError> {
        LOGGER.debug(&format!(
            "update_replication_factor use case called for pipeline_id={} and replication_factor={}",
            pipeline_id, replication_factor
        ));
        let limits = effective_limits(
            self.license_repository.as_ref(),
            self.plan_repository.as_ref(),
            org_id,
        )
        .await?
        .limits;
        if let Some(sub) = self.license_repository.get_subscription().await? {
            if sub.is_restricted() {
                return Err(LicenseError::LimitExceeded {
                    reason: "your last payment failed; update your card before rescaling pipelines"
                        .into(),
                }
                .into());
            }
        }
        if *replication_factor > limits.max_replicas_per_pipeline {
            return Err(LicenseError::LimitExceeded {
                reason: format!(
                    "your current plan allows up to {} replicas per pipeline",
                    limits.max_replicas_per_pipeline
                ),
            }
            .into());
        }
        let pipeline_id = DataStoreId::new(*pipeline_id)?;
        self.repository
            .update_pipeline_replication_factor(org_id, &pipeline_id, replication_factor)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to update pipeline id={} with replication factor={}: {e}",
                    pipeline_id.id(),
                    replication_factor
                ));
                e
            })?;
        LOGGER.info(&format!(
            "Pipeline id={} updated with replication factor={} successfully",
            pipeline_id.id(),
            replication_factor
        ));
        Ok(())
    }
}
