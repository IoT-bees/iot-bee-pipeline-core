use async_trait::async_trait;
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::{DataSourceError, IoTBeeError};
use domain::outbound::data_source::DataSource;
use tokio::sync::mpsc::Sender;

pub struct KafkaDataSource;

#[async_trait]
impl DataSource for KafkaDataSource {
    async fn start_to_consume(
        &self,
        _sender: Sender<DataConsumerRawType>,
    ) -> Result<(), IoTBeeError> {
        Err(IoTBeeError::DataSourceError(
            DataSourceError::ConnectionFailed {
                reason: "Kafka data source is not yet implemented".to_string(),
            },
        ))
    }
}
