use async_trait::async_trait;
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::IoTBeeError;

use super::general_messages::{GetActorOperationStatusMessageResult, SendActorActionMessageResult};
#[async_trait]
pub trait SendActionToActor: Send + Sync {
    // async fn send_start_actor(&self) -> SendActorActionMessageResult;
    async fn send_stop_actor(&self) -> SendActorActionMessageResult;
    async fn send_restart_actor(&self) -> SendActorActionMessageResult;
    async fn get_actor_operation_status(&self) -> GetActorOperationStatusMessageResult;
}
#[async_trait]
pub trait SendDataToProcessor: SendActionToActor {
    async fn send(&self, data: &DataConsumerRawType) -> Result<(), IoTBeeError>;
}

#[async_trait]
pub trait SendDataToStore: SendActionToActor {
    async fn send(&self, data: &DataConsumerRawType) -> Result<(), IoTBeeError>;
}
