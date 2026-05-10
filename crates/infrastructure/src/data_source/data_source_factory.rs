use super::{
    kafka_data_source::KafkaDataSource,
    mqtt_data_source::MqttDataSource,
    rabbitmq_data_source::{RabbitMQConfig, RabbitMQDataSource},
    source_type::SourceType,
};
use domain::outbound::data_source::DataSource;
use std::error::Error;
use std::sync::Arc;
pub struct DataSourceFactory;

impl DataSourceFactory {
    pub fn create_data_source(
        source_type: SourceType,
        config: impl Into<String>,
    ) -> Result<Arc<dyn DataSource + Send + Sync>, Box<dyn Error>> {
        match source_type {
            SourceType::RabbitMq => {
                let rabbitmq_config: RabbitMQConfig = serde_json::from_str(config.into().as_str())?;

                Ok(Arc::new(RabbitMQDataSource::new(
                    rabbitmq_config.url,
                    rabbitmq_config.queue_name,
                    rabbitmq_config.consumer_name,
                )))
            }
            SourceType::Mqtt => Ok(Arc::new(MqttDataSource)),
            SourceType::Kafka => Ok(Arc::new(KafkaDataSource)),
        }
    }
}
