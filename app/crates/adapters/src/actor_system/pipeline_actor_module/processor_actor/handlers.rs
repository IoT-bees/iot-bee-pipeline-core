use crate::actor_system::pipeline_actor_module::processor_actor::data_processor_actor::DataProcessorActor;
use crate::actor_system::pipeline_actor_module::processor_actor::messages::{
    ProcessDataMessage, ProcessDataResult,
};

use super::super::general_messages::{
    GetActorOperationStatusMessage, GetActorOperationStatusMessageResult, GetFlowTelemetryMessage,
    GetFlowTelemetryMessageResult, GetLastErrorMessage, GetLastErrorMessageResult,
    GetLastProcessedAtMessage, GetLastProcessedAtMessageResult, ResponseActorActionMessage,
    SendActorActionMessage, SendActorActionMessageResult,
};
use actix::prelude::*;
use domain::ast::schemas::{ProcessingOutcome, RejectionKind};
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::{DomainValidationError, PipelineLifecycleError};
use domain::usage::entities::UsageEvent;
use domain::value_objects::lifecycle_values::{ActorActions, ActorOperationStatus};
use logging::AppLogger;
use serde_json::{Value, json};
use std::env;
use std::fs::OpenOptions;
use std::io::Write;

static LOGGER: AppLogger = AppLogger::new(
    "iot_bee::adapters::actor_system::pipeline_actor_module::processor_actor::handlers",
);

enum ProcessingResult {
    Validated,
    Rejected,
}

/// Formatea un RejectionReason en un mensaje legible para logs
fn format_rejection_reason(rejection: &domain::ast::schemas::RejectionReason) -> String {
    match &rejection.reason {
        RejectionKind::MissingRequiredField => {
            format!(
                "Campo requerido '{}' no está presente",
                rejection.field_name
            )
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

fn record_demo_rejection(payload: &str, reason: &str) {
    let Ok(path) = env::var("DEMO_TRACE_PATH") else {
        return;
    };

    let parsed_payload = serde_json::from_str::<Value>(payload).unwrap_or_else(|_| json!({}));
    let trace = json!({
        "event_id": parsed_payload.get("event_id").and_then(Value::as_str),
        "rejected_at": chrono::Utc::now().to_rfc3339(),
        "reason": reason,
        "payload": parsed_payload,
    });

    let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) else {
        return;
    };
    let _ = writeln!(file, "{trace}");
}

impl Handler<ProcessDataMessage> for DataProcessorActor {
    type Result = ResponseActFuture<Self, ProcessDataResult>;

    fn handle(&mut self, msg: ProcessDataMessage, _ctx: &mut Self::Context) -> Self::Result {
        let data_store = self.data_store();
        let data_processor_actions = self.data_processor_actions();
        let usage_scope = self.usage_scope();
        let usage_meter = self.usage_meter();

        Box::pin(
            async move {
                let data = msg.data();
                let outcome = match data_processor_actions.process_data(data).await {
                    Ok(outcome) => outcome,
                    Err(error) => {
                        let _ = usage_meter.record(usage_scope, UsageEvent::Failed).await;
                        return Err(error);
                    }
                };

                match outcome {
                    ProcessingOutcome::Processed(output) => {
                        usage_meter
                            .record(usage_scope, UsageEvent::Validated)
                            .await?;
                        // Serializar y enviar al data store
                        let json = serde_json::to_string(&output).map_err(|e| {
                            DomainValidationError::DataFormatError {
                                reason: format!("Error al serializar resultado: {}", e),
                            }
                        })?;
                        let processed_data = DataConsumerRawType::new(json)?;

                        match data_store.send(&processed_data).await {
                            Ok(()) => Ok(ProcessingResult::Validated),
                            Err(error) => {
                                let _ = usage_meter.record(usage_scope, UsageEvent::Failed).await;
                                Err(error)
                            }
                        }
                    }
                    ProcessingOutcome::Rejected(rejection) => {
                        usage_meter.record(usage_scope, UsageEvent::Invalid).await?;
                        // Log warning pero no tratarlo como error del sistema
                        let reason = format_rejection_reason(&rejection);
                        record_demo_rejection(data.value(), &reason);
                        //POSTERIORMENTE VOY A IMPLEMENTAR UN 4 ACTOR ACA PARA CREAR SISTEMAS DE ALARMAS EVENT DRIVEN, POR AHORA SOLO LOGUEAMOS
                        LOGGER.warn(&format!("Dato rechazado por validación: {}", reason));
                        Ok(ProcessingResult::Rejected)
                    }
                }
            }
            .into_actor(self)
            .map(|res, actor, _ctx| match res {
                Ok(ProcessingResult::Validated) => {
                    if actor.get_operation_state() != ActorOperationStatus::Healthy {
                        actor.set_operation_state(ActorOperationStatus::Healthy);
                    }
                    actor.record_validated();
                    Ok(())
                }
                Ok(ProcessingResult::Rejected) => {
                    if actor.get_operation_state() != ActorOperationStatus::Healthy {
                        actor.set_operation_state(ActorOperationStatus::Healthy);
                    }
                    actor.record_rejected();
                    Ok(())
                }
                Err(e) => {
                    LOGGER.error(&format!("Error sending data to store: {}", e));
                    actor.set_operation_state(ActorOperationStatus::Degraded);
                    actor.mark_error(format!("processor: {}", e));
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

impl Handler<GetLastProcessedAtMessage> for DataProcessorActor {
    type Result = GetLastProcessedAtMessageResult;

    fn handle(
        &mut self,
        _msg: GetLastProcessedAtMessage,
        _ctx: &mut Context<Self>,
    ) -> Self::Result {
        Ok(self.last_processed_at())
    }
}

impl Handler<GetLastErrorMessage> for DataProcessorActor {
    type Result = GetLastErrorMessageResult;

    fn handle(&mut self, _msg: GetLastErrorMessage, _ctx: &mut Context<Self>) -> Self::Result {
        Ok(self.last_error().map(|s| s.to_string()))
    }
}

impl Handler<GetFlowTelemetryMessage> for DataProcessorActor {
    type Result = GetFlowTelemetryMessageResult;

    fn handle(&mut self, _msg: GetFlowTelemetryMessage, _ctx: &mut Context<Self>) -> Self::Result {
        Ok(self.flow_telemetry())
    }
}
