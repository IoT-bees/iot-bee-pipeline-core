use crate::ast::schemas::ProcessingOutcome;
use crate::entities::data_consumer_types::DataConsumerRawType;
use crate::error::IoTBeeError;
use async_trait::async_trait;

#[async_trait]
pub trait DataProcessorActions {
    async fn process_data(
        &self,
        data_to_process: &DataConsumerRawType,
    ) -> Result<ProcessingOutcome, IoTBeeError>;
}
