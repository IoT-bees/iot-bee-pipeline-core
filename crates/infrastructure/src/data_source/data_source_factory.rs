use super::{
    kafka_data_source::KafkaDataSource,
    mqtt_data_source::MqttDataSource,
    rabbitmq_data_source::RabbitMQDataSource,
};
use domain::outbound::data_source::DataSource;
use domain::value_objects::data_source_values::{DataSourceType, KafkaConfig, MqttConfig, RabbitmqConfig};
use std::error::Error;
use std::sync::Arc;
pub struct DataSourceFactory;

impl DataSourceFactory {
    pub fn create_data_source(
        source_type: DataSourceType,
        config: impl Into<String>,
    ) -> Result<Arc<dyn DataSource + Send + Sync>, Box<dyn Error>> {
        let config_str = config.into();
        match source_type {
            DataSourceType::RabbitMq => {
                let rabbitmq_config: RabbitmqConfig = serde_json::from_str(&config_str)?;
                Ok(Arc::new(RabbitMQDataSource::new(rabbitmq_config)))
            }
            DataSourceType::Mqtt => {
                let mqtt_config: MqttConfig = serde_json::from_str(&config_str)?;
                Ok(Arc::new(MqttDataSource::new(mqtt_config)))
            }
            DataSourceType::Kafka => {
                let kafka_config: KafkaConfig = serde_json::from_str(&config_str)?;
                Ok(Arc::new(KafkaDataSource::new(kafka_config)))
            }
        }
    }
}
