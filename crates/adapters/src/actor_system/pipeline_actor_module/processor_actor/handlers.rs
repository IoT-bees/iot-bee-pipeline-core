use crate::actor_system::pipeline_actor_module::processor_actor::data_processor_actor::DataProcessorActor;
use crate::actor_system::pipeline_actor_module::processor_actor::messages::{
    ProcessDataMessage, ProcessDataResult,
};

use actix::prelude::*;
use domain::error::PipelineLifecycleError;
use logging::AppLogger;

static LOGGER: AppLogger = AppLogger::new(
    "iot_bee::adapters::actor_system::pipeline_actor_module::processor_actor::handlers",
);

impl Handler<ProcessDataMessage> for DataProcessorActor {
    type Result = ResponseFuture<ProcessDataResult>;

    fn handle(&mut self, msg: ProcessDataMessage, _ctx: &mut Self::Context) -> Self::Result {
        let data_store = self.data_store();
        let data_processor_actions = self.data_processor_actions();

        Box::pin(async move {
            let data = msg.data();
            let message_process_result = data_processor_actions.process_data(data).await?;
            data_store.send(&message_process_result).await.map_err(|e| {
                LOGGER.error(&format!("Failed to send data to store: {}", e));
                PipelineLifecycleError::InternalCommunication {
                    reason: format!("Failed to send data to store: {}", e),
                }
                .into()
            })
        })
    }
}

use super::super::general_messages::{
    ActorActions, ResponseActorActionMessage, SendActorActionMessage, SendActorActionMessageResult,
};

impl Handler<SendActorActionMessage> for DataProcessorActor {
    type Result = ResponseFuture<SendActorActionMessageResult>;

    fn handle(&mut self, msg: SendActorActionMessage, ctx: &mut Self::Context) -> Self::Result {
        LOGGER.info(&format!("Received action message: {:?}", msg.action()));
        match msg.action() {
            ActorActions::Stop => {
                LOGGER.info("Stopping data processing...");
                ctx.stop();
                Box::pin(async {
                    LOGGER.info("DataProcessorActor stopped");
                    Ok(ResponseActorActionMessage::stopped())
                })
            }
            ActorActions::Restart => {
                LOGGER.info("Restarting data processing...");
                Box::pin(async {
                    LOGGER.info("DataProcessorActor restarting");
                    Ok(ResponseActorActionMessage::restarting())
                })
            }
            ActorActions::Status => {
                LOGGER.info("Checking data processing status...");
                Box::pin(async {
                    LOGGER.info("DataProcessorActor running");
                    Ok(ResponseActorActionMessage::running())
                })
            }
        }
    }
}
