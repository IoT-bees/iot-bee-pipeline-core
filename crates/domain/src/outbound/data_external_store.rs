use crate::entities::data_consumer_types::DataConsumerRawType;
use crate::error::IoTBeeError;
use async_trait::async_trait;
#[async_trait]
pub trait DataExternalStore {
    async fn save(&self, data: DataConsumerRawType) -> Result<(), IoTBeeError>;
}
