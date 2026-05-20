use actix::prelude::*;
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::IoTBeeError;

pub struct ProcessDataMessage(DataConsumerRawType);
impl ProcessDataMessage {
    pub fn new(data: DataConsumerRawType) -> Self {
        ProcessDataMessage(data)
    }
    pub fn data(&self) -> &DataConsumerRawType {
        &self.0
    }
}
pub type ProcessDataResult = Result<(), IoTBeeError>;
impl Message for ProcessDataMessage {
    type Result = ProcessDataResult;
}
