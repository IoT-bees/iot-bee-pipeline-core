use async_trait::async_trait;
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::{DataSourceError, IoTBeeError};
use domain::outbound::data_source::DataSource;
use domain::value_objects::data_source_values::KafkaConfig;
use tokio::sync::mpsc::Sender;

pub struct KafkaDataSource {
    _config: KafkaConfig,
}

impl KafkaDataSource {
    pub fn new(config: KafkaConfig) -> Self {
        KafkaDataSource { _config: config }
    }
}

#[async_trait]
impl DataSource for KafkaDataSource {
    async fn start_to_consume(
        &self,
        _sender: Sender<DataConsumerRawType>,
    ) -> Result<(), IoTBeeError> {
        Err(DataSourceError::NotSupported {
            kind: "kafka".into(),
        }
        .into())
    }
}
