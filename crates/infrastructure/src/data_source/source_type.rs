use domain::error::{DomainValidationError, IoTBeeError};

pub enum SourceType {
    RabbitMq,
    Mqtt,
    Kafka,
}

impl TryFrom<&str> for SourceType {
    type Error = IoTBeeError;

    fn try_from(s: &str) -> Result<Self, Self::Error> {
        match s {
            "RABBIT_MQ" => Ok(SourceType::RabbitMq),
            "MQTT" => Ok(SourceType::Mqtt),
            "KAFKA" => Ok(SourceType::Kafka),
            other => Err(IoTBeeError::DomainValidationError(
                DomainValidationError::DataFormatError {
                    reason: format!("Unknown source type: {}", other),
                },
            )),
        }
    }
}
