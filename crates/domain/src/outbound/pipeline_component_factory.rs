use crate::entities::data_source::PipelineDataSourceOutputModel;
use crate::entities::data_store::PipelineDataStoreOutputModel;
use crate::entities::validation_schema::PipelineNewValidateSchema;
use crate::error::IoTBeeError;
use crate::outbound::{
    data_external_store::DataExternalStore,
    data_processor_actions::DataProcessorActions,
    data_source::DataSource,
};
use std::sync::Arc;

/// Puerto de salida que abstrae la creación de los componentes de ejecución
/// de un pipeline.
pub trait PipelineComponentFactory: Send + Sync {
    fn create_data_source(
        &self,
        config: &PipelineDataSourceOutputModel,
    ) -> Result<Arc<dyn DataSource + Send + Sync>, IoTBeeError>;

    fn create_data_processor(
        &self,
        schema: &PipelineNewValidateSchema,
    ) -> Result<Arc<dyn DataProcessorActions + Send + Sync>, IoTBeeError>;

    fn create_data_store(
        &self,
        store: &PipelineDataStoreOutputModel,
    ) -> Result<Arc<dyn DataExternalStore + Send + Sync>, IoTBeeError>;
}
