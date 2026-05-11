use domain::error::IoTBeeError;
use domain::value_objects::data_source_values::{
    DataSourceType, KafkaConfig as DomainKafkaConfig, MqttConfig as DomainMqttConfig,
    PipelineDataSourceConfig, RabbitmqConfig as DomainRabbitmqConfig,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::{Validate, ValidationErrors};

// ---------------------------------------------------------------------------
// DTOs locales — contienen ToSchema y Validate sin contaminar el dominio
// ---------------------------------------------------------------------------

#[derive(Deserialize, Serialize, ToSchema, Validate)]
pub struct RabbitmqConfig {
    #[validate(length(min = 1))]
    pub url: String,
    #[validate(length(min = 1))]
    pub queue_name: String,
    #[validate(length(min = 1))]
    pub consumer_name: String,
}

#[derive(Deserialize, Serialize, ToSchema, Validate)]
pub struct MqttConfig {
    #[validate(length(min = 1))]
    pub broker_url: String,
    #[validate(length(min = 1))]
    pub topic: String,
    #[validate(length(min = 1))]
    pub client_id: String,
}

#[derive(Deserialize, Serialize, ToSchema, Validate)]
pub struct KafkaConfig {
    #[validate(length(min = 1))]
    pub brokers: Vec<String>,
    #[validate(length(min = 1))]
    pub topic: String,
    #[validate(length(min = 1))]
    pub group_id: String,
}

// ---------------------------------------------------------------------------
// Enum discriminado — usa los DTOs locales
// ---------------------------------------------------------------------------

#[derive(Deserialize, Serialize, ToSchema)]
#[serde(tag = "sourceType", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DataSourceConfig {
    Rabbitmq(RabbitmqConfig),
    Mqtt(MqttConfig),
    Kafka(KafkaConfig),
}

impl Validate for DataSourceConfig {
    fn validate(&self) -> Result<(), ValidationErrors> {
        match self {
            DataSourceConfig::Rabbitmq(cfg) => cfg.validate(),
            DataSourceConfig::Mqtt(cfg) => cfg.validate(),
            DataSourceConfig::Kafka(cfg) => cfg.validate(),
        }
    }
}

impl DataSourceConfig {
    pub fn source_type_name(&self) -> &'static str {
        match self {
            DataSourceConfig::Rabbitmq(_) => "RABBITMQ",
            DataSourceConfig::Mqtt(_) => "MQTT",
            DataSourceConfig::Kafka(_) => "KAFKA",
        }
    }

    pub fn available_source_types() -> Vec<&'static str> {
        vec!["RABBITMQ", "MQTT", "KAFKA"]
    }

    pub fn get_data_source_type(&self) -> DataSourceType {
        match self {
            DataSourceConfig::Rabbitmq(_) => DataSourceType::RabbitMq,
            DataSourceConfig::Mqtt(_) => DataSourceType::Mqtt,
            DataSourceConfig::Kafka(_) => DataSourceType::Kafka,
        }
    }
}

// ---------------------------------------------------------------------------
// Conversión al tipo del dominio
// ---------------------------------------------------------------------------

impl TryFrom<DataSourceConfig> for PipelineDataSourceConfig {
    type Error = IoTBeeError;

    fn try_from(config: DataSourceConfig) -> Result<Self, Self::Error> {
        match config {
            DataSourceConfig::Rabbitmq(c) => Ok(PipelineDataSourceConfig::Rabbitmq(
                DomainRabbitmqConfig::new(c.url, c.queue_name, c.consumer_name)?,
            )),
            DataSourceConfig::Mqtt(c) => Ok(PipelineDataSourceConfig::Mqtt(
                DomainMqttConfig::new(c.broker_url, c.topic, c.client_id)?,
            )),
            DataSourceConfig::Kafka(c) => Ok(PipelineDataSourceConfig::Kafka(
                DomainKafkaConfig::new(c.brokers, c.topic, c.group_id)?,
            )),
        }
    }
}
