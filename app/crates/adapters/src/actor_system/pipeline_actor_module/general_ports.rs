use async_trait::async_trait;
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::IoTBeeError;

use super::general_messages::{
    GetActorOperationStatusMessageResult, GetFlowTelemetryMessageResult, GetLastErrorMessageResult,
    GetLastProcessedAtMessageResult, SendActorActionMessageResult,
};
#[async_trait]
pub trait SendActionToActor: Send + Sync {
    // async fn send_start_actor(&self) -> SendActorActionMessageResult;
    async fn send_stop_actor(&self) -> SendActorActionMessageResult;
    async fn send_restart_actor(&self) -> SendActorActionMessageResult;
    async fn get_actor_operation_status(&self) -> GetActorOperationStatusMessageResult;
    async fn get_last_processed_at(&self) -> GetLastProcessedAtMessageResult;
    async fn get_last_error(&self) -> GetLastErrorMessageResult;
    async fn get_flow_telemetry(&self) -> GetFlowTelemetryMessageResult;
}
#[async_trait]
pub trait SendDataToProcessor: SendActionToActor {
    async fn send(&self, data: &DataConsumerRawType) -> Result<(), IoTBeeError>;
}

#[async_trait]
pub trait SendDataToStore: SendActionToActor {
    async fn send(&self, data: &DataConsumerRawType) -> Result<(), IoTBeeError>;
}
