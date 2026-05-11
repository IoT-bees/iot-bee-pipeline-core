use domain::entities::data_source::PipelineDataSourceOutputModel;
use domain::entities::data_store::PipelineDataStoreOutputModel;
use domain::entities::validation_schema::PipelineNewValidateSchema;
use domain::error::{DomainValidationError, IoTBeeError};
use domain::outbound::data_external_store::DataExternalStore;
use domain::outbound::data_processor_actions::DataProcessorActions;
use domain::outbound::data_source::DataSource;
use domain::outbound::pipeline_component_factory::PipelineComponentFactory;

use crate::data_external_persistence::external_persistence_factory::ExternalPersistenceFactory;
use crate::data_processor::data_process::PipelineDataProcessorCore;

use crate::data_source::data_source_factory::DataSourceFactory;

use std::sync::Arc;

pub struct InfrastructurePipelineComponentFactory;

impl InfrastructurePipelineComponentFactory {
    pub fn new() -> Self {
        Self
    }
}

impl PipelineComponentFactory for InfrastructurePipelineComponentFactory {
    fn create_data_source(
        &self,
        config: &PipelineDataSourceOutputModel,
    ) -> Result<Arc<dyn DataSource + Send + Sync>, IoTBeeError> {
        let source_type = config.source_type();
        let config_json = serde_json::to_string(config.data_source_configuration())
            .map_err(|e| DomainValidationError::DataFormatError {
                reason: format!("Failed to serialize data source config: {}", e),
            })?;
        let data_source =
            DataSourceFactory::create_data_source(source_type, config_json)
                .map_err(|e| DomainValidationError::DataFormatError {
                    reason: format!(
                        "Invalid configuration for source id {}: {}",
                        config.id(),
                        e
                    ),
                })?;
        Ok(data_source)
    }

    fn create_data_processor(
        &self,
        schema: &PipelineNewValidateSchema,
    ) -> Result<Arc<dyn DataProcessorActions + Send + Sync>, IoTBeeError> {
        let processor = PipelineDataProcessorCore::new(schema.schema.schema())?;
        Ok(Arc::new(processor))
    }

    fn create_data_store(
        &self,
        store: &PipelineDataStoreOutputModel,
    ) -> Result<Arc<dyn DataExternalStore + Send + Sync>, IoTBeeError> {
        let data_external_store = ExternalPersistenceFactory::create_external_persistence(
            store.configuration(),
        )
        .map_err(|e| DomainValidationError::DataFormatError {
            reason: format!(
                "Invalid configuration for external persistence store id {}: {}",
                store.id(),
                e
            ),
        })?;

        Ok(data_external_store)
    }
}
