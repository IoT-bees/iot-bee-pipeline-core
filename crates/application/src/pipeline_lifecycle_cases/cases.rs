use async_trait::async_trait;
// use domain::entities::{data_source, data_store};
use domain::error::{IoTBeeError, PipelineLifecycleError};

use domain::entities::pipeline_data::PipelineConfiguration;
use domain::inbound::pipeline_lifecycle::PipelineLifecycle;
use domain::outbound::license_repository::LicenseRepository;
use domain::outbound::pipeline_component_factory::PipelineComponentFactory;
use domain::outbound::pipeline_persistence::{
    PipelineControllerRepository, PipelineDataSourceRepository, PipelineDataStoreRepository,
    PipelineValidationSchemaRepository,
};
use domain::plan::outbound::plan_repository::PlanRepository;
use domain::value_objects::lifecycle_values::PipelineStatusReport;
use domain::value_objects::pipelines_values::{DataStoreId, ReplicationFactor};
use logging::AppLogger;
use std::sync::Arc;

use crate::license_cases::cases::effective_limits;

static LOGGER: AppLogger = AppLogger::new("iot_bee::application::pipeline_lifecycle_cases::cases");

#[async_trait]
pub trait PipelineLifecycleCases {
    async fn start_all_pipelines_in_system(&self) -> Result<(), IoTBeeError>;
    async fn start_new_pipeline(&self, id: u32) -> Result<(), IoTBeeError>;
    async fn stop_pipeline(&self, id: u32) -> Result<(), IoTBeeError>;
    async fn get_pipeline_status(&self, id: u32) -> Result<PipelineStatusReport, IoTBeeError>;
    async fn get_all_pipeline_status(&self) -> Result<Vec<PipelineStatusReport>, IoTBeeError>;
    async fn update_pipeline_replication_factor(
        &self,
        id: u32,
        replication_factor: u32,
    ) -> Result<(), IoTBeeError>;
}

pub struct PipelineLifecycleCasesImpl {
    pipeline_lifecycle: Box<dyn PipelineLifecycle + Send + Sync>,
    pipeline_controller: Box<dyn PipelineControllerRepository + Send + Sync>,
    data_source_repository: Box<dyn PipelineDataSourceRepository + Send + Sync>,
    validation_schema_repository: Box<dyn PipelineValidationSchemaRepository + Send + Sync>,
    data_store_repository: Box<dyn PipelineDataStoreRepository + Send + Sync>,
    component_factory: Box<dyn PipelineComponentFactory + Send + Sync>,
    license_repository: Box<dyn LicenseRepository + Send + Sync>,
    plan_repository: Arc<dyn PlanRepository>,
    // TODO(plan-07): the lifecycle/actor system has no per-request JWT context;
    // multi-org support requires either threading org_id through the actor messages
    // or iterating orgs at startup. For now stay on the default tenant.
    organization_id: i64,
}

impl PipelineLifecycleCasesImpl {
    pub fn new(
        pipeline_lifecycle: Box<dyn PipelineLifecycle + Send + Sync>,
        pipeline_controller: Box<dyn PipelineControllerRepository + Send + Sync>,
        data_source_repository: Box<dyn PipelineDataSourceRepository + Send + Sync>,
        validation_schema_repository: Box<dyn PipelineValidationSchemaRepository + Send + Sync>,
        data_store_repository: Box<dyn PipelineDataStoreRepository + Send + Sync>,
        component_factory: Box<dyn PipelineComponentFactory + Send + Sync>,
        license_repository: Box<dyn LicenseRepository + Send + Sync>,
        plan_repository: Arc<dyn PlanRepository>,
    ) -> Self {
        Self {
            pipeline_lifecycle,
            pipeline_controller,
            data_source_repository,
            validation_schema_repository,
            data_store_repository,
            component_factory,
            license_repository,
            plan_repository,
            organization_id: 1,
        }
    }
}

#[async_trait]
impl PipelineLifecycleCases for PipelineLifecycleCasesImpl {
    async fn start_all_pipelines_in_system(&self) -> Result<(), IoTBeeError> {
        // Startup runs before any request context, so it enumerates every pipeline
        // regardless of organization. Per-pipeline lookups for dependencies still
        // happen below using the system-wide finders.
        let pipelines = self
            .pipeline_controller
            .list_all_pipelines_for_startup()
            .await?;

        let total = pipelines.len();
        let mut started = 0u32;
        let mut skipped = 0u32;
        let mut failed = 0u32;

        for pipeline in pipelines {
            let id = pipeline.id().id();

            if !pipeline.is_active() {
                LOGGER.info(&format!("[pipeline id={}] skipped — inactive", id,));
                skipped += 1;
                continue;
            }

            let data_source = match self
                .data_source_repository
                .get_pipeline_data_source(
                    self.organization_id,
                    &DataStoreId::new(pipeline.data_source_id())?,
                )
                .await
            {
                Ok(v) => v,
                Err(e) => {
                    LOGGER.error(&format!(
                        "[pipeline id={}] error reading data source: {}",
                        id, e
                    ));
                    failed += 1;
                    continue;
                }
            };

            let validation_schema = match self
                .validation_schema_repository
                .get_pipeline_validation_schema(
                    self.organization_id,
                    &DataStoreId::new(pipeline.validation_schema_id())?,
                )
                .await
            {
                Ok(v) => v,
                Err(e) => {
                    LOGGER.error(&format!(
                        "[pipeline id={}] error reading validation schema: {}",
                        id, e
                    ));
                    failed += 1;
                    continue;
                }
            };

            let data_store = match self
                .data_store_repository
                .get_pipeline_data_store_by_id(
                    self.organization_id,
                    &DataStoreId::new(pipeline.store_id())?,
                )
                .await
            {
                Ok(v) => v,
                Err(e) => {
                    LOGGER.error(&format!(
                        "[pipeline id={}] error reading data store: {}",
                        id, e
                    ));
                    failed += 1;
                    continue;
                }
            };

            let (Some(data_source), Some(validation_schema), Some(data_store)) =
                (data_source, validation_schema, data_store)
            else {
                LOGGER.error(&format!(
                    "[pipeline id={}] missing dependency — data_source, validation_schema or data_store not found",
                    id
                ));

                failed += 1;
                continue;
            };

            let pipeline_config = match PipelineConfiguration::new(
                pipeline.name(),
                pipeline.pipeline_replication(),
            ) {
                Ok(v) => v,
                Err(e) => {
                    LOGGER.error(&format!(
                        "[pipeline id={}] invalid pipeline configuration: {}",
                        id, e
                    ));
                    failed += 1;
                    continue;
                }
            };

            let data_source_component =
                match self.component_factory.create_data_source(&data_source) {
                    Ok(v) => v,
                    Err(e) => {
                        LOGGER.error(&format!(
                            "[pipeline id={}] failed to build data source component: {}",
                            id, e
                        ));
                        failed += 1;
                        continue;
                    }
                };

            let data_processor_component = match self
                .component_factory
                .create_data_processor(&validation_schema)
            {
                Ok(v) => v,
                Err(e) => {
                    LOGGER.error(&format!(
                        "[pipeline id={}] failed to build data processor component: {}",
                        id, e
                    ));
                    failed += 1;
                    continue;
                }
            };

            let data_store_component = match self.component_factory.create_data_store(&data_store) {
                Ok(v) => v,
                Err(e) => {
                    LOGGER.error(&format!(
                        "[pipeline id={}] failed to build data store component: {}",
                        id, e
                    ));
                    failed += 1;
                    continue;
                }
            };

            match self
                .pipeline_lifecycle
                .start(
                    pipeline.id(),
                    pipeline_config,
                    data_source_component,
                    data_processor_component,
                    data_store_component,
                )
                .await
            {
                Ok(_) => {
                    LOGGER.info(&format!("[pipeline id={}] started successfully", id));
                    started += 1;
                }
                Err(e) => {
                    LOGGER.error(&format!("[pipeline id={}] failed to start: {}", id, e));
                    failed += 1;
                }
            }
        }

        LOGGER.info(&format!(
            "Pipeline startup complete — total={} started={} skipped={} failed={}",
            total, started, skipped, failed
        ));

        Ok(())
    }

    async fn start_new_pipeline(&self, id: u32) -> Result<(), IoTBeeError> {
        let pipeline_id = DataStoreId::new(id)?;

        let pipeline = self
            .pipeline_controller
            .get_pipeline_by_id(self.organization_id, &pipeline_id)
            .await?
            .ok_or_else(|| {
                LOGGER.error(&format!("Pipeline not found for id={}", pipeline_id.id()));
                PipelineLifecycleError::NotFound {
                    pipeline_id: (pipeline_id.id().to_string()),
                }
            })?;

        let data_source = self
            .data_source_repository
            .get_pipeline_data_source(
                self.organization_id,
                &DataStoreId::new(pipeline.data_source_id())?,
            )
            .await?
            .ok_or_else(|| {
                LOGGER.error(&format!(
                    "Data source not found for pipeline id={}",
                    pipeline_id.id()
                ));
                PipelineLifecycleError::NotFound {
                    pipeline_id: pipeline_id.id().to_string(),
                }
            })?;

        let data_store = self
            .data_store_repository
            .get_pipeline_data_store_by_id(
                self.organization_id,
                &DataStoreId::new(pipeline.store_id())?,
            )
            .await?
            .ok_or_else(|| {
                LOGGER.error(&format!(
                    "Data store not found for pipeline id={}",
                    pipeline_id.id()
                ));
                PipelineLifecycleError::NotFound {
                    pipeline_id: pipeline_id.id().to_string(),
                }
            })?;

        let validation_schema = self
            .validation_schema_repository
            .get_pipeline_validation_schema(
                self.organization_id,
                &DataStoreId::new(pipeline.validation_schema_id())?,
            )
            .await?
            .ok_or_else(|| {
                LOGGER.error(&format!(
                    "Validation schema not found for pipeline id={}",
                    pipeline_id.id()
                ));
                PipelineLifecycleError::NotFound {
                    pipeline_id: pipeline_id.id().to_string(),
                }
            })?;

        let pipeline_config =
            PipelineConfiguration::new(pipeline.name(), pipeline.pipeline_replication())?;

        let data_source_component = self.component_factory.create_data_source(&data_source)?;
        let data_processor_component = self
            .component_factory
            .create_data_processor(&validation_schema)?;
        let data_store_component = self.component_factory.create_data_store(&data_store)?;

        LOGGER.info(&format!(
            "Trying to start pipeline with id={}",
            pipeline_id.id()
        ));
        self.pipeline_lifecycle
            .start(
                pipeline.id(),
                pipeline_config,
                data_source_component,
                data_processor_component,
                data_store_component,
            )
            .await?;

        let update_pipeline_state = self
            .pipeline_controller
            .update_pipeline_state(self.organization_id, pipeline.id(), true)
            .await;
        if update_pipeline_state.is_err() {
            LOGGER.error(&format!(
                "Failed to update pipeline state to active for pipeline id={}",
                pipeline_id.id()
            ));
            self.pipeline_lifecycle.stop(&pipeline_id).await?;
        }

        LOGGER.info(&format!(
            "Pipeline with id={} started successfully",
            pipeline_id.id()
        ));

        Ok(())
    }

    async fn stop_pipeline(&self, id: u32) -> Result<(), IoTBeeError> {
        let pipeline_id = DataStoreId::new(id)?;
        self.pipeline_controller
            .update_pipeline_state(self.organization_id, &pipeline_id, false)
            .await?;
        self.pipeline_lifecycle.stop(&pipeline_id).await
    }

    async fn get_pipeline_status(&self, id: u32) -> Result<PipelineStatusReport, IoTBeeError> {
        let pipeline_id = DataStoreId::new(id)?;
        let report = self
            .pipeline_lifecycle
            .get_status_by_id(&pipeline_id)
            .await?;
        let pipeline = self
            .pipeline_controller
            .get_pipeline_by_id(self.organization_id, &pipeline_id)
            .await?
            .ok_or_else(|| PipelineLifecycleError::NotFound {
                pipeline_id: id.to_string(),
            })?;
        Ok(report.with_metadata(id, pipeline.name()))
    }
    async fn get_all_pipeline_status(&self) -> Result<Vec<PipelineStatusReport>, IoTBeeError> {
        let reports = self.pipeline_lifecycle.get_all_status().await?;
        let mut enriched = Vec::with_capacity(reports.len());
        for report in reports {
            let pid = report.pipeline_id();
            let pipeline = self
                .pipeline_controller
                .find_pipeline_by_id_for_system(&DataStoreId::new(pid)?)
                .await
                .ok()
                .flatten();
            let name = pipeline.map(|p| p.name().to_string()).unwrap_or_default();
            enriched.push(report.with_metadata(pid, name));
        }
        Ok(enriched)
    }

    async fn update_pipeline_replication_factor(
        &self,
        id: u32,
        replication_factor: u32,
    ) -> Result<(), IoTBeeError> {
        let pipeline_id = DataStoreId::new(id)?;
        let replication_factor = ReplicationFactor::new(replication_factor)?.replication_factor();
        let limits = effective_limits(
            self.license_repository.as_ref(),
            self.plan_repository.as_ref(),
            self.organization_id,
        )
        .await?
        .limits;
        if let Some(sub) = self.license_repository.get_subscription().await? {
            if sub.is_restricted() {
                return Err(domain::error::LicenseError::LimitExceeded {
                    reason: "your last payment failed; update your card before rescaling pipelines"
                        .into(),
                }
                .into());
            }
        }
        if replication_factor > limits.max_replicas_per_pipeline {
            return Err(domain::error::LicenseError::LimitExceeded {
                reason: format!(
                    "your current plan allows up to {} replicas per pipeline",
                    limits.max_replicas_per_pipeline
                ),
            }
            .into());
        }

        let pipeline = self
            .pipeline_controller
            .get_pipeline_by_id(self.organization_id, &pipeline_id)
            .await?
            .ok_or_else(|| PipelineLifecycleError::NotFound {
                pipeline_id: id.to_string(),
            })?;

        if pipeline.is_active() {
            self.pipeline_lifecycle
                .update_replication_factor(&pipeline_id, &replication_factor)
                .await?;
        }

        self.pipeline_controller
            .update_pipeline_replication_factor(
                self.organization_id,
                &pipeline_id,
                &replication_factor,
            )
            .await
    }
}
