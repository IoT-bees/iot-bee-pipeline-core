use crate::actor_system::pipeline_actor_module::processor_actor::data_processor_actor::DataProcessorActor;
use crate::actor_system::pipeline_actor_module::processor_actor::messages::{
    ProcessDataMessage, ProcessDataResult,
};

use super::super::general_messages::{
    GetActorOperationStatusMessage, GetActorOperationStatusMessageResult,
    ResponseActorActionMessage, SendActorActionMessage, SendActorActionMessageResult,
};
use actix::prelude::*;
use domain::ast::schemas::{ProcessingOutcome, RejectionKind};
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::{DomainValidationError, PipelineLifecycleError};
use domain::value_objects::lifecycle_values::{ActorActions, ActorOperationStatus};
use logging::AppLogger;

static LOGGER: AppLogger = AppLogger::new(
    "iot_bee::adapters::actor_system::pipeline_actor_module::processor_actor::handlers",
);

/// Formatea un RejectionReason en un mensaje legible para logs
fn format_rejection_reason(rejection: &domain::ast::schemas::RejectionReason) -> String {
    match &rejection.reason {
        RejectionKind::MissingRequiredField => {
            format!("Campo requerido '{}' no está presente", rejection.field_name)
        }
        RejectionKind::BelowMinimum { value, min } => {
            format!(
                "Campo '{}': valor {} está por debajo del mínimo {}",
                rejection.field_name, value, min
            )
        }
        RejectionKind::ExceedsMaximum { value, max } => {
            format!(
                "Campo '{}': valor {} excede el máximo {}",
                rejection.field_name, value, max
            )
        }
        RejectionKind::InvalidType { expected } => {
            format!(
                "Campo '{}': tipo inválido, se esperaba {}",
                rejection.field_name, expected
            )
        }
    }
}

impl Handler<ProcessDataMessage> for DataProcessorActor {
    type Result = ResponseActFuture<Self, ProcessDataResult>;

    fn handle(&mut self, msg: ProcessDataMessage, _ctx: &mut Self::Context) -> Self::Result {
        let data_store = self.data_store();
        let data_processor_actions = self.data_processor_actions();

        Box::pin(
            async move {
                let data = msg.data();
                let outcome = data_processor_actions.process_data(data).await?;

                match outcome {
                    ProcessingOutcome::Processed(output) => {
                        // Serializar y enviar al data store
                        let json = serde_json::to_string(&output)
                            .map_err(|e| DomainValidationError::DataFormatError {
                                reason: format!("Error al serializar resultado: {}", e),
                            })?;
                        let processed_data = DataConsumerRawType::new(json)?;
                        
                        data_store.send(&processed_data).await
                    }
                    ProcessingOutcome::Rejected(rejection) => {
                        // Log warning pero no tratarlo como error del sistema
                        let reason = format_rejection_reason(&rejection);
                        //POSTERIORMENTE VOY A IMPLEMENTAR UN 4 ACTOR ACA PARA CREAR SISTEMAS DE ALARMAS EVENT DRIVEN, POR AHORA SOLO LOGUEAMOS
                        LOGGER.warn(&format!(
                            "Dato rechazado por validación: {} | Dato original: {}", 
                            reason, 
                            rejection.original_data
                        ));                        
                        Ok(())
                    }
                }
            }
            .into_actor(self)
            .map(|res, actor, _ctx| match res {
                Ok(_) => {
                    if actor.get_operation_state() != ActorOperationStatus::Healthy {
                        actor.set_operation_state(ActorOperationStatus::Healthy);
                    }
                    Ok(())
                }
                Err(e) => {
                    LOGGER.error(&format!("Error sending data to store: {}", e));
                    actor.set_operation_state(ActorOperationStatus::Degraded);
                    Err(PipelineLifecycleError::OperationFailed {
                        reason: format!("Error sending data to store: {}", e),
                    }
                    .into())
                }
            }),
        )
    }
}

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

impl Handler<GetActorOperationStatusMessage> for DataProcessorActor {
    type Result = GetActorOperationStatusMessageResult;

    fn handle(
        &mut self,
        _msg: GetActorOperationStatusMessage,
        _ctx: &mut Context<Self>,
    ) -> Self::Result {
        Ok(self.get_operation_state())
    }
}
