use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::{Validate, ValidationErrors};

#[derive(Deserialize, Serialize, ToSchema)]
#[serde(tag = "sourceType", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DataSourceConfig {
    Rabbitmq(RabbitmqConfig),
    Mqtt(MqttConfig),
    Kafka(KafkaConfig),
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
