use actix::prelude::*;
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::IoTBeeError;

pub type StoreActorResult = Result<(), IoTBeeError>;
pub struct SendDataToStoreMessage(DataConsumerRawType);
impl SendDataToStoreMessage {
    pub fn new(data: &DataConsumerRawType) -> Self {
        SendDataToStoreMessage(data.clone())
    }
    pub fn data(&self) -> &DataConsumerRawType {
        &self.0
    }
}
impl Message for SendDataToStoreMessage {
    type Result = StoreActorResult;
}
