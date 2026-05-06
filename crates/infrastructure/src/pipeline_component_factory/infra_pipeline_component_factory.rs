use domain::entities::data_source::PipelineDataSourceOutputModel;
use domain::entities::data_store::PipelineDataStoreOutputModel;
use domain::entities::validation_schema::PipelineNewValidateSchema;
use domain::error::{IoTBeeError, DomainValidationError};
use domain::outbound::data_external_store::DataExternalStore;
use domain::outbound::data_processor_actions::DataProcessorActions;
use domain::outbound::data_source::DataSource;
use domain::outbound::pipeline_component_factory::PipelineComponentFactory;

use crate::data_external_persistence::data_store::InfluxDbDataExternalStore;
use crate::data_processor::data_process::PipelineDataProcessorCore;
use crate::data_source::rabbitmq_data_source::RabbitMQDataSource;

use serde::Deserialize;
use std::sync::Arc;

#[derive(Deserialize)]
struct RabbitMQConfig {
    url: String,
    queue_name: String,
    consumer_name: String,
}

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
        let rabbitmq_config: RabbitMQConfig =
            serde_json::from_str(config.data_source_configuration()).map_err(|e| {
                DomainValidationError::DataFormatError {
                    reason: format!(
                        "Invalid data source configuration for source id {}: {}",
                        config.id(),
                        e
                    ),
                }
            })?;

        Ok(Arc::new(RabbitMQDataSource::new(
            rabbitmq_config.url,
            rabbitmq_config.queue_name,
            rabbitmq_config.consumer_name,
        )))
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
        _store: &PipelineDataStoreOutputModel,
    ) -> Result<Arc<dyn DataExternalStore + Send + Sync>, IoTBeeError> {
        Ok(Arc::new(InfluxDbDataExternalStore))
    }
}
