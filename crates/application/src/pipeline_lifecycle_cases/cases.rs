
use async_trait::async_trait;
use domain::error::IoTBeeError;

use domain::inbound::pipeline_lifecycle::PipelineLifecycle;
use domain::outbound::pipeline_persistence::{
    PipelineControllerRepository, PipelineDataSourceRepository, PipelineDataStoreRepository,
    PipelineValidationSchemaRepository,
};
use domain::outbound::pipeline_component_factory::PipelineComponentFactory;
use domain::entities::pipeline_data::PipelineConfiguration;
use domain::value_objects::pipelines_values::DataStoreId;

use logging::AppLogger;

static LOGGER: AppLogger = AppLogger::new("iot_bee::application::pipeline_lifecycle_cases::cases");

#[async_trait]
pub trait PipelineLifecycleCases {
    async fn start_all_pipelines_in_system(&self) -> Result<(), IoTBeeError>;
}

pub struct PipelineLifecycleCasesImpl {
    pipeline_lifecycle: Box<dyn PipelineLifecycle + Send + Sync>,
    pipeline_controller: Box<dyn PipelineControllerRepository + Send + Sync>,
    data_source_repository: Box<dyn PipelineDataSourceRepository + Send + Sync>,
    validation_schema_repository: Box<dyn PipelineValidationSchemaRepository + Send + Sync>,
    data_store_repository: Box<dyn PipelineDataStoreRepository + Send + Sync>,
    component_factory: Box<dyn PipelineComponentFactory + Send + Sync>,
}

impl PipelineLifecycleCasesImpl {
    pub fn new(
        pipeline_lifecycle: Box<dyn PipelineLifecycle + Send + Sync>,
        pipeline_controller: Box<dyn PipelineControllerRepository + Send + Sync>,
        data_source_repository: Box<dyn PipelineDataSourceRepository + Send + Sync>,
        validation_schema_repository: Box<dyn PipelineValidationSchemaRepository + Send + Sync>,
        data_store_repository: Box<dyn PipelineDataStoreRepository + Send + Sync>,
        component_factory: Box<dyn PipelineComponentFactory + Send + Sync>,
    ) -> Self {
        Self {
            pipeline_lifecycle,
            pipeline_controller,
            data_source_repository,
            validation_schema_repository,
            data_store_repository,
            component_factory,
        }
    }
}

#[async_trait]
impl PipelineLifecycleCases for PipelineLifecycleCasesImpl {
    async fn start_all_pipelines_in_system(&self) -> Result<(), IoTBeeError> {
        let pipelines = self.pipeline_controller.get_pipeline().await?;

        let total = pipelines.len();
        let mut started = 0u32;
        let mut skipped = 0u32;
        let mut failed = 0u32;

        
        for pipeline in pipelines {
            let id = pipeline.id().id();

            if !pipeline.is_active() {
                LOGGER.info(&format!(
                    "[pipeline id={}] skipped — inactive",
                    id,
                ));
                skipped += 1;
                continue;
            }


            let data_source = match self
                .data_source_repository
                .get_pipeline_data_source(&DataStoreId::new(pipeline.data_source_id())?)
                .await
            {
                Ok(v) => v,
                Err(e) => {
                    LOGGER.error(&format!("[pipeline id={}] error reading data source: {}", id, e));
                    failed += 1;
                    continue;
                }
            };

            let validation_schema = match self
                .validation_schema_repository
                .get_pipeline_validation_schema(&DataStoreId::new(pipeline.validation_schema_id())?)
                .await
            {
                Ok(v) => v,
                Err(e) => {
                    LOGGER.error(&format!("[pipeline id={}] error reading validation schema: {}", id, e));
                    failed += 1;
                    continue;
                }
            };

            let data_store = match self
                .data_store_repository
                .get_pipeline_data_store_by_id(&DataStoreId::new(pipeline.store_id())?)
                .await
            {
                Ok(v) => v,
                Err(e) => {
                    LOGGER.error(&format!("[pipeline id={}] error reading data store: {}", id, e));
                    failed += 1;
                    continue;
                }
            };

            LOGGER.info(&format!(
                "[pipeline id={}] dependencies read successfully — data_source={}, validation_schema={}, data_store={}",
                id,
                data_source.as_ref().map(|ds| ds.name()).unwrap_or("None"),
                validation_schema.as_ref().map(|vs| vs.name()).unwrap_or("None"),
                data_store.as_ref().map(|ds| ds.name()).unwrap_or("None"),
            ));

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
                    LOGGER.error(&format!("[pipeline id={}] invalid pipeline configuration: {}", id, e));
                    failed += 1;
                    continue;
                }
            };

            let data_source_component = match self.component_factory.create_data_source(&data_source) {
                Ok(v) => v,
                Err(e) => {
                    LOGGER.error(&format!("[pipeline id={}] failed to build data source component: {}", id, e));
                    failed += 1;
                    continue;
                }
            };

            let data_processor_component =
                match self.component_factory.create_data_processor(&validation_schema) {
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
                    LOGGER.error(&format!("[pipeline id={}] failed to build data store component: {}", id, e));
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
}

