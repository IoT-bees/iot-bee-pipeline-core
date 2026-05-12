use actix::fut::wrap_future;
use actix::prelude::*;
use tokio::sync::mpsc;

use crate::actor_system::pipeline_actor_module::consumer_actor::{
    data_consumer_actor::DataConsumerActor,
    messages::{ConsumerActorAction, ConsumerActorActionMessage, ConsumerActorState},
};
use crate::actor_system::pipeline_actor_module::general_messages::{
    GetActorOperationStatusMessage, GetActorOperationStatusMessageResult,
    ResponseActorActionMessage, SendActorActionMessage, SendActorActionMessageResult,
};
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::PipelineLifecycleError;
use domain::value_objects::lifecycle_values::{ActorActions, ActorOperationStatus};
use logging::AppLogger;

static LOGGER: AppLogger = AppLogger::new(
    "iot_bee::adapters::actor_system::pipeline_actor_module::consumer_actor::handlers",
);
use std::time::Duration;
use tokio::time::sleep;

const CHANNEL_CAPACITY: usize = 100;
const ACTOR_RECONNECT_DELAY: Duration = Duration::from_secs(30);

impl Handler<ConsumerActorActionMessage> for DataConsumerActor {
    type Result = ResponseActFuture<Self, ConsumerActorState>;

    fn handle(&mut self, msg: ConsumerActorActionMessage, ctx: &mut Context<Self>) -> Self::Result {
        match msg.action() {
            ConsumerActorAction::StartConsuming => {
                // Si ya está consumiendo, no hacemos nada.
                if self.state() == ConsumerActorState::Consuming {
                    LOGGER
                        .warn("StartConsuming received but actor is already consuming. Ignoring.");
                    self.set_operation_state(ActorOperationStatus::Healthy);
                    return Box::pin(async { ConsumerActorState::Consuming }.into_actor(self));
                }
                // Si está deteniendo/detenido, ignorar cualquier retry programado.
                if matches!(self.state(), ConsumerActorState::Stopping | ConsumerActorState::Stopped) {
                    LOGGER.info("StartConsuming retry received but actor is stopping/stopped. Ignoring.");
                    let state = self.state();
                    return Box::pin(async move { state }.into_actor(self));
                }

                let (tx, rx) = mpsc::channel::<DataConsumerRawType>(CHANNEL_CAPACITY);
                self.set_sender(Some(tx.clone()));

                
                if self.state() == ConsumerActorState::Reconnecting {
                    self.set_operation_state(ActorOperationStatus::Degraded);
                }

                let data_source = self.data_source();
                let actor_addr = ctx.address();
                let sender_to_processor = self.data_processor();
                let handle = tokio::spawn(async move {
                    let mut rx = rx;
                    LOGGER.info("DataConsumerActor started consuming data from DataSource...");
                    while let Some(data) = rx.recv().await {
                        // LOGGER.info(&format!("Received data from DataSource: {:?}", data));
                        if let Err(e) = sender_to_processor.send(&data).await {
                            LOGGER.error(&format!("Failed to send data to processor: {}", e));
                        }
                    }
                    LOGGER.info("DataConsumerActor channel closed, stopping consumption.");
                    actor_addr.do_send(ConsumerActorActionMessage::channel_died());
                });
                self.task_handle = Some(handle);

                Box::pin(
                    wrap_future::<_, Self>(async move { data_source.start_to_consume(tx).await })
                        .map(|result, actor, ctx| {
                            match result {
                                Ok(_) => {
                                    actor.set_state(ConsumerActorState::Consuming);
                                    actor.set_operation_state(ActorOperationStatus::Healthy);
                                    LOGGER.info("Consumer started successfully");
                                }
                                Err(e) => {
                                    // Abortar el task de forwarding para evitar un ChannelDied espurio.
                                    if let Some(handle) = actor.task_handle.take() {
                                        handle.abort();
                                    }
                                    actor.set_sender(None);
                                    actor.set_state(ConsumerActorState::Reconnecting);
                                    actor.set_operation_state(ActorOperationStatus::Degraded);
                                    LOGGER.error(&format!(
                                        "No se pudo iniciar el consumo (reintentos agotados): {}. \
                                         Reintentando en {}s...",
                                        e,
                                        ACTOR_RECONNECT_DELAY.as_secs()
                                    ));
                                    ctx.notify_later(
                                        ConsumerActorActionMessage::start_consuming(),
                                        ACTOR_RECONNECT_DELAY,
                                    );
                                }
                            }
                            actor.state()
                        }),
                )
            }

            ConsumerActorAction::StopConsuming => {
                if self.state() == ConsumerActorState::Stopped
                    || self.state() == ConsumerActorState::Stopping
                {
                    LOGGER.warn(
                        "StopConsuming received but actor is already stopping/stopped. Ignoring.",
                    );
                    let state = self.state();
                    return Box::pin(async move { state }.into_actor(self));
                }

                // Abortar el task que tiene rx → rx se dropea → sender.closed() se activa en RabbitMQ.
                if let Some(handle) = self.task_handle.take() {
                    handle.abort();
                }
                self.set_sender(None);
                self.set_state(ConsumerActorState::Stopping);
                self.set_operation_state(ActorOperationStatus::Idle);
                LOGGER
                    .info("StopConsuming received. Task aborted, rx dropped, RabbitMQ will detect sender.closed().");

                Box::pin(async { ConsumerActorState::Stopping }.into_actor(self))
            }

            ConsumerActorAction::ChannelDied => {
                match self.state() {
                    ConsumerActorState::Consuming => {
                        LOGGER.warn(
                            "ChannelDied received while consuming. Transitioning to Reconnecting.",
                        );
                        self.task_handle.take(); // handle ya terminó, limpiar
                        // self.sender ya es None: todos los tx fueron dropeados para que rx cerrara
                        self.set_state(ConsumerActorState::Reconnecting);
                        self.set_operation_state(ActorOperationStatus::Degraded);
                        ctx.address()
                            .do_send(ConsumerActorActionMessage::start_consuming());
                    }
                    ConsumerActorState::Stopped | ConsumerActorState::Stopping => {
                        LOGGER.warn("Channel closed after stopping/stopped action. Ignoring.");
                    }
                    _ => {
                        LOGGER.warn(
                            "ChannelDied received but actor is not in Consuming state. Ignoring.",
                        );
                    }
                }
                let state = self.state();
                Box::pin(async move { state }.into_actor(self))
            }

            ConsumerActorAction::GetState => {
                let state = self.state();
                Box::pin(async move { state }.into_actor(self))
            }
        }
    }
}

//
// Handler implementation for receiving control messages (Stop, Restart, Status) from external sources via SendActorActionMessage
//

impl Handler<SendActorActionMessage> for DataConsumerActor {
    type Result = ResponseActFuture<Self, SendActorActionMessageResult>;

    fn handle(&mut self, msg: SendActorActionMessage, ctx: &mut Self::Context) -> Self::Result {
        match msg.action() {
            ActorActions::Stop => {
                LOGGER.info("DataConsumerActor: Stop action received.");
                let context = ctx.address();
                Box::pin(
                    wrap_future::<_, Self>(async move {
                        let stop_result = context
                            .send(ConsumerActorActionMessage::stop_consuming())
                            .await
                            .map_err(|e| PipelineLifecycleError::InternalCommunication {
                                reason: e.to_string(),
                            })?;

                        if stop_result != ConsumerActorState::Stopping
                            && stop_result != ConsumerActorState::Stopped
                        {
                            LOGGER.warn(format!(
                                "DataConsumerActor: Unexpected state after stop command: {:?}. Stop may have failed.",
                                stop_result
                            ));
                            return Ok(ResponseActorActionMessage::failed());
                        }
                        LOGGER.info("DataConsumerActor: Stop command acknowledged, stopping consumption.");
                        Ok(ResponseActorActionMessage::stopped())
                    })
                    .map(|result, _actor, ctx| {
                        ctx.stop();
                        result
                    }),
                )
            }
            ActorActions::Restart => {
                let context = ctx.address();
                Box::pin(wrap_future::<_, Self>(async move {
                    LOGGER.info("DataConsumerActor: Restart action received.");
                    let stop_result = context
                        .send(ConsumerActorActionMessage::stop_consuming())
                        .await
                        .map_err(|e| PipelineLifecycleError::InternalCommunication {
                            reason: (e.to_string()),
                        })?;

                    if stop_result != ConsumerActorState::Stopping
                        && stop_result != ConsumerActorState::Stopped
                    {
                        LOGGER.warn(format!("DataConsumerActor: Unexpected state after stop command: {:?}. Continuing with restart.", stop_result));
                        return Ok(ResponseActorActionMessage::failed());
                    }
                    LOGGER.info(
                        "DataConsumerActor: Stop command acknowledged, proceeding with restart.",
                    );

                    sleep(std::time::Duration::from_millis(100)).await;
                    let start_result = context
                        .send(ConsumerActorActionMessage::start_consuming())
                        .await
                        .map_err(|e| PipelineLifecycleError::InternalCommunication {
                            reason: (e.to_string()),
                        })?;
                    if start_result != ConsumerActorState::Consuming
                        && start_result != ConsumerActorState::Reconnecting
                    {
                        LOGGER.warn(format!("DataConsumerActor: Unexpected state after start command: {:?}. Restart may have failed.", start_result));
                        return Ok(ResponseActorActionMessage::failed());
                    }
                    LOGGER.info("DataConsumerActor: Restart completed successfully.");
                    Ok(ResponseActorActionMessage::restarting())
                })
                .map(|result, _actor, _ctx| result))
            }
            ActorActions::Status => {
                LOGGER.info("DataConsumerActor: Status action received.");
                let current = self.state();
                Box::pin(
                    wrap_future::<_, Self>(async move {
                        let status = match current {
                            ConsumerActorState::Consuming | ConsumerActorState::Reconnecting => {
                                ResponseActorActionMessage::running()
                            }
                            ConsumerActorState::Stopped | ConsumerActorState::Stopping => {
                                ResponseActorActionMessage::stopped()
                            }
                            ConsumerActorState::Idle => ResponseActorActionMessage::running(),
                        };
                        Ok(status)
                    })
                    .map(|result, _actor, _ctx| result),
                )
            }
        }
    }
}

impl Handler<GetActorOperationStatusMessage> for DataConsumerActor {
    type Result = GetActorOperationStatusMessageResult;
    fn handle(
        &mut self,
        _msg: GetActorOperationStatusMessage,
        _ctx: &mut Self::Context,
    ) -> Self::Result {
        Ok(self.get_operation_state())
    }
}
