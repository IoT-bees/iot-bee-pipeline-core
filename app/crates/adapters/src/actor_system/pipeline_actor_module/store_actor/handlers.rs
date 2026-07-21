use super::super::general_messages::{
    GetActorOperationStatusMessage, GetActorOperationStatusMessageResult, GetFlowTelemetryMessage,
    GetFlowTelemetryMessageResult, GetLastErrorMessage, GetLastErrorMessageResult,
    GetLastProcessedAtMessage, GetLastProcessedAtMessageResult, ResponseActorActionMessage,
    SendActorActionMessage, SendActorActionMessageResult,
};
use super::data_store_actor::DataStoreActor;
use super::messages::{SendDataToStoreMessage, StoreActorResult};
use domain::value_objects::lifecycle_values::{ActorActions, ActorOperationStatus};

use actix::prelude::*;
use domain::error::PipelineLifecycleError;
use domain::usage::entities::UsageEvent;
use logging::AppLogger;

static LOGGER: AppLogger =
    AppLogger::new("iot_bee::adapters::actor_system::pipeline_actor_module::store_actor::handlers");

use async_trait::async_trait;

#[async_trait]
impl Handler<SendDataToStoreMessage> for DataStoreActor {
    type Result = ResponseActFuture<Self, StoreActorResult>;

    fn handle(&mut self, msg: SendDataToStoreMessage, _ctx: &mut Context<Self>) -> Self::Result {
        let data = msg.data().clone();
        let external_store = self.external_store();
        let usage_scope = self.usage_scope();
        let usage_meter = self.usage_meter();

        Box::pin(
            async move {
                //TODO: agregar el manejo de errores el, retray y las ultimas validaciones de datos antes de insertar en el store.
                LOGGER.info("Received SendDataToStoreMessage, saving data to external store...");
                let bytes_out = data.value().len() as u64;
                match external_store.save(data).await {
                    Ok(()) => {
                        usage_meter
                            .record(usage_scope, UsageEvent::Delivered { bytes_out })
                            .await?;
                        Ok(())
                    }
                    Err(error) => {
                        let _ = usage_meter.record(usage_scope, UsageEvent::Failed).await;
                        Err(error)
                    }
                }
            }
            .into_actor(self)
            .map(|res, actor, _ctx| match res {
                Ok(_) => {
                    // LOGGER.info("Data successfully saved to external store.");
                    if actor.get_operation_state() != ActorOperationStatus::Healthy {
                        actor.set_operation_state(ActorOperationStatus::Healthy);
                    }
                    actor.record_delivered();
                    Ok(())
                }
                Err(e) => {
                    LOGGER.error(&format!("Error saving data to external store: {}", e));
                    actor.set_operation_state(ActorOperationStatus::Degraded);
                    actor.mark_error(format!("store: {}", e));
                    Err(PipelineLifecycleError::OperationFailed {
                        reason: format!("Error saving data to external store: {}", e),
                    }
                    .into())
                }
            }),
        )
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
                //Nota: esto funciona como un healtcheck de que el actor esta activo
                LOGGER.info("DataStoreActor: Status action received.");
                Box::pin(async move {
                    LOGGER.info("DataStoreActor running");
                    Ok(ResponseActorActionMessage::running())
                })
            }
        }
    }
}

impl Handler<GetActorOperationStatusMessage> for DataStoreActor {
    type Result = GetActorOperationStatusMessageResult;

    fn handle(
        &mut self,
        _msg: GetActorOperationStatusMessage,
        _ctx: &mut Context<Self>,
    ) -> Self::Result {
        Ok(self.get_operation_state())
    }
}

impl Handler<GetLastProcessedAtMessage> for DataStoreActor {
    type Result = GetLastProcessedAtMessageResult;

    fn handle(
        &mut self,
        _msg: GetLastProcessedAtMessage,
        _ctx: &mut Context<Self>,
    ) -> Self::Result {
        Ok(self.last_processed_at())
    }
}

impl Handler<GetLastErrorMessage> for DataStoreActor {
    type Result = GetLastErrorMessageResult;

    fn handle(&mut self, _msg: GetLastErrorMessage, _ctx: &mut Context<Self>) -> Self::Result {
        Ok(self.last_error().map(|s| s.to_string()))
    }
}

impl Handler<GetFlowTelemetryMessage> for DataStoreActor {
    type Result = GetFlowTelemetryMessageResult;

    fn handle(&mut self, _msg: GetFlowTelemetryMessage, _ctx: &mut Context<Self>) -> Self::Result {
        Ok(self.flow_telemetry())
    }
}
