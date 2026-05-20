use crate::error::{DomainValidationError, IoTBeeError};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[serde(tag = "sourceType", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PipelineDataSourceConfig {
    RabbitMq(RabbitmqConfig),
    Mqtt(MqttConfig),
    Kafka(KafkaConfig),
}

impl PipelineDataSourceConfig {
    pub fn source_type(&self) -> DataSourceType {
        match self {
            Self::RabbitMq(_) => DataSourceType::RabbitMq,
            Self::Mqtt(_) => DataSourceType::Mqtt,
            Self::Kafka(_) => DataSourceType::Kafka,
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct RabbitmqConfig {
    url: String,
    queue_name: String,
    consumer_name: String,
}

impl RabbitmqConfig {
    pub fn new(
        url: impl Into<String>,
        queue_name: impl Into<String>,
        consumer_name: impl Into<String>,
    ) -> Result<Self, IoTBeeError> {
        let url = url.into();
        let queue_name = queue_name.into();
        let consumer_name = consumer_name.into();

        if url.is_empty() {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "url".to_string(),
                reason: "must not be empty".to_string(),
            }
            .into());
        }
        if queue_name.is_empty() {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "queue_name".to_string(),
                reason: "must not be empty".to_string(),
            }
            .into());
        }
        if consumer_name.is_empty() {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "consumer_name".to_string(),
                reason: "must not be empty".to_string(),
            }
            .into());
        }

        Ok(Self {
            url,
            queue_name,
            consumer_name,
        })
    }

    pub fn url(&self) -> &str {
        &self.url
    }
    pub fn queue_name(&self) -> &str {
        &self.queue_name
    }
    pub fn consumer_name(&self) -> &str {
        &self.consumer_name
    }
}

#[derive(Serialize, Deserialize)]
pub struct MqttConfig {
    broker_url: String,
    topic: String,
    client_id: String,
}

impl MqttConfig {
    pub fn new(
        broker_url: impl Into<String>,
        topic: impl Into<String>,
        client_id: impl Into<String>,
    ) -> Result<Self, IoTBeeError> {
        let broker_url = broker_url.into();
        let topic = topic.into();
        let client_id = client_id.into();

        if broker_url.is_empty() {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "broker_url".to_string(),
                reason: "must not be empty".to_string(),
            }
            .into());
        }
        if topic.is_empty() {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "topic".to_string(),
                reason: "must not be empty".to_string(),
            }
            .into());
        }
        if client_id.is_empty() {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "client_id".to_string(),
                reason: "must not be empty".to_string(),
            }
            .into());
        }

        Ok(Self {
            broker_url,
            topic,
            client_id,
        })
    }

    pub fn broker_url(&self) -> &str {
        &self.broker_url
    }
    pub fn topic(&self) -> &str {
        &self.topic
    }
    pub fn client_id(&self) -> &str {
        &self.client_id
    }
}

#[derive(Serialize, Deserialize)]
pub struct KafkaConfig {
    brokers: Vec<String>,
    topic: String,
    group_id: String,
}

impl KafkaConfig {
    pub fn new(
        brokers: Vec<String>,
        topic: impl Into<String>,
        group_id: impl Into<String>,
    ) -> Result<Self, IoTBeeError> {
        let topic = topic.into();
        let group_id = group_id.into();

        if brokers.is_empty() {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "brokers".to_string(),
                reason: "must not be empty".to_string(),
            }
            .into());
        }
        if topic.is_empty() {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "topic".to_string(),
                reason: "must not be empty".to_string(),
            }
            .into());
        }
        if group_id.is_empty() {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "group_id".to_string(),
                reason: "must not be empty".to_string(),
            }
            .into());
        }

        Ok(Self {
            brokers,
            topic,
            group_id,
        })
    }

    pub fn brokers(&self) -> &[String] {
        &self.brokers
    }
    pub fn topic(&self) -> &str {
        &self.topic
    }
    pub fn group_id(&self) -> &str {
        &self.group_id
    }
}

pub enum DataSourceType {
    RabbitMq,
    Mqtt,
    Kafka,
}

impl TryFrom<&str> for DataSourceType {
    type Error = IoTBeeError;

    fn try_from(s: &str) -> Result<Self, Self::Error> {
        match s {
            "RABBIT_MQ" => Ok(Self::RabbitMq),
            "MQTT" => Ok(Self::Mqtt),
            "KAFKA" => Ok(Self::Kafka),
            other => Err(DomainValidationError::InvalidFieldValue {
                field_name: "DataSourceType".to_string(),
                reason: format!("Unknown data source type: {}", other),
            }
            .into()),
        }
    }
}

impl From<DataSourceType> for String {
    fn from(t: DataSourceType) -> Self {
        match t {
            DataSourceType::RabbitMq => "RABBIT_MQ".to_string(),
            DataSourceType::Mqtt => "MQTT".to_string(),
            DataSourceType::Kafka => "KAFKA".to_string(),
        }
    }
}
