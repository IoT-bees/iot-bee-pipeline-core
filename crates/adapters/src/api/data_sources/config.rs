use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, Serialize, ToSchema)]
#[serde(tag = "sourceType", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DataSourceConfig {
    RabbitMq(RabbitMqConfig),
    Mqtt(MqttConfig),
    Kafka(KafkaConfig),
}

impl DataSourceConfig {
    pub fn source_type_name(&self) -> &'static str {
        match self {
            DataSourceConfig::RabbitMq(_) => "RABBITMQ",
            DataSourceConfig::Mqtt(_) => "MQTT",
            DataSourceConfig::Kafka(_) => "KAFKA",
        }
    }
}

#[derive(Deserialize, Serialize, ToSchema)]
pub struct RabbitMqConfig {
    pub url: String,
    pub queue_name: String,
    pub consumer_name: String,
}

#[derive(Deserialize, Serialize, ToSchema)]
pub struct MqttConfig {
    pub broker_url: String,
    pub topic: String,
    pub client_id: String,
}

#[derive(Deserialize, Serialize, ToSchema)]
pub struct KafkaConfig {
    pub brokers: Vec<String>,
    pub topic: String,
    pub group_id: String,
}
