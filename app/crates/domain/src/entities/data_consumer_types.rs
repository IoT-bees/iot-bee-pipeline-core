use crate::error::IoTBeeError;

#[derive(Debug, Clone)]
pub struct DataConsumerRawType(String);
impl DataConsumerRawType {
    pub fn new(value: impl Into<String>) -> Result<Self, IoTBeeError> {
        Ok(DataConsumerRawType(value.into()))
    }
    pub fn value(&self) -> &str {
        &self.0
    }
}
