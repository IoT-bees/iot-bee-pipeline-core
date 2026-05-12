use crate::entities::pipeline_data::PipelineConfiguration;
use crate::error::IoTBeeError;
use crate::outbound::{
    data_external_store::DataExternalStore, data_processor_actions::DataProcessorActions,
    data_source::DataSource,
};
use crate::value_objects::lifecycle_values::PipelineStatusReport;
use crate::value_objects::pipelines_values::DataStoreId;
use async_trait::async_trait;
use std::sync::Arc;

#[async_trait]
pub trait PipelineLifecycle {
    async fn start(
        &self,
        pipeline_id: &DataStoreId,
        pipeline_config: PipelineConfiguration,
        data_source: Arc<dyn DataSource + Send + Sync>,
        data_processor: Arc<dyn DataProcessorActions + Send + Sync>,
        data_store: Arc<dyn DataExternalStore + Send + Sync>,
    ) -> Result<(), IoTBeeError>;

    async fn stop(&self, pipeline_id: &DataStoreId) -> Result<(), IoTBeeError>;
    async fn get_status_by_id(
        &self,
        pipeline_id: &DataStoreId,
    ) -> Result<PipelineStatusReport, IoTBeeError>;
    async fn get_all_status(&self) -> Result<Vec<PipelineStatusReport>, IoTBeeError>;
    // async fn get_status(&self) -> Result<Vec<(DataStoreId, PipelineStatus)>, IoTBeeError>;
}
