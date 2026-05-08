use async_trait::async_trait;

use crate::entities::data_consumer_types::DataConsumerRawType;
use crate::error::IoTBeeError;
use tokio::sync::mpsc::Sender;

#[async_trait]
pub trait DataSource {
    //se envia el sender para que el data source pueda enviar los datos al consumer  y obtener los datos mientras controlamos el flujo y el canal desde afuera.
    async fn start_to_consume(
        &self,
        sender: Sender<DataConsumerRawType>,
    ) -> Result<(), IoTBeeError>;
}
// TODO:  desacoplar esta implementacion de tokio
