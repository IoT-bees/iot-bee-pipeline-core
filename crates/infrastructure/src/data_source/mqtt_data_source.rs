use async_trait::async_trait;
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::{DataSourceError, IoTBeeError};
use domain::outbound::data_source::DataSource;
use domain::value_objects::data_source_values::MqttConfig;
use tokio::sync::mpsc::Sender;

pub struct MqttDataSource {
    config: MqttConfig,
}

impl MqttDataSource {
    pub fn new(config: MqttConfig) -> Self {
        MqttDataSource { config }
    }
}

#[async_trait]
impl DataSource for MqttDataSource {
    async fn start_to_consume(
        &self,
        _sender: Sender<DataConsumerRawType>,
    ) -> Result<(), IoTBeeError> {
        Err(IoTBeeError::DataSourceError(
            DataSourceError::ConnectionFailed {
                reason: "MQTT data source is not yet implemented".to_string(),
            },
        ))
    }
}
