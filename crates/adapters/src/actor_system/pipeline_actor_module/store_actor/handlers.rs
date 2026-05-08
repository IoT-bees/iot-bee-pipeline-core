use super::data_store_actor::DataStoreActor;
use super::messages::{SendDataToStoreMessage, StoreActorResult};
use crate::actor_system::pipeline_actor_module::general_messages::{
    ActorActions, ResponseActorActionMessage, SendActorActionMessage, SendActorActionMessageResult,
};
use actix::prelude::*;
use logging::AppLogger;

static LOGGER: AppLogger =
    AppLogger::new("iot_bee::adapters::actor_system::pipeline_actor_module::store_actor::handlers");

use async_trait::async_trait;

#[async_trait]
impl Handler<SendDataToStoreMessage> for DataStoreActor {
    type Result = ResponseFuture<StoreActorResult>;

    fn handle(&mut self, msg: SendDataToStoreMessage, _ctx: &mut Context<Self>) -> Self::Result {
        let data = msg.data().clone();
        let external_store = self.external_store();

        Box::pin(async move {
            //TODO: agregar el manejo de errores el, retray y las ultimas validaciones de datos antes de insertar en el store.
            LOGGER.info("Received SendDataToStoreMessage, saving data to external store...");
            external_store.save(data).await
        })
    }
}

impl Handler<SendActorActionMessage> for DataStoreActor {
    type Result = ResponseFuture<SendActorActionMessageResult>;

    fn handle(&mut self, msg: SendActorActionMessage, ctx: &mut Self::Context) -> Self::Result {
        match msg.action() {
            ActorActions::Stop => {
                LOGGER.info("DataStoreActor: Stop action received.");
                let response = ResponseActorActionMessage::stopped();
                ctx.stop();
                Box::pin(async move {
                    LOGGER.info("DataStoreActor stopped");
                    Ok(response)
                })
            }
            ActorActions::Restart => {
                LOGGER.info("DataStoreActor: Restart action received.");
                //TODO: implementar la logica de reinicio.
                Box::pin(async move {
                    LOGGER.info("DataStoreActor restarting...");
                    Ok(ResponseActorActionMessage::restarting())
                })
            }

            ActorActions::Status => {
                LOGGER.info("DataStoreActor: Status action received.");
                //TODO: implementar la logica de status.
                Box::pin(async move {
                    LOGGER.info("DataStoreActor running");
                    Ok(ResponseActorActionMessage::running())
                })
            }
        }
    }
}
