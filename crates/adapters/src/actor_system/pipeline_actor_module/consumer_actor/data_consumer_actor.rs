use actix::prelude::*;
use chrono::{DateTime, Utc};
use std::sync::Arc;
use tokio::sync::mpsc::Sender;
use tokio::task::JoinHandle;

use crate::actor_system::pipeline_actor_module::consumer_actor::messages::{
    ConsumerActorActionMessage, ConsumerActorState,
};
use crate::actor_system::pipeline_actor_module::general_messages::{
    GetActorOperationStatusMessage, GetActorOperationStatusMessageResult, GetLastErrorMessage,
    GetLastErrorMessageResult, GetLastProcessedAtMessage, GetLastProcessedAtMessageResult,
    SendActorActionMessage, SendActorActionMessageResult,
};
use crate::actor_system::pipeline_actor_module::general_ports::SendActionToActor;
use crate::actor_system::pipeline_actor_module::general_ports::SendDataToProcessor;
use async_trait::async_trait;
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::PipelineLifecycleError;
use domain::outbound::data_source::DataSource;
use domain::value_objects::lifecycle_values::ActorOperationStatus;

use logging::AppLogger;
static LOGGER: AppLogger = AppLogger::new(
    "iot_bee::adapters::actor_system::pipeline_actor_module::consumer_actor::DataConsumerActor",
);

type DataProcessorThreadSafe = Arc<dyn SendDataToProcessor + Send + Sync + 'static>;
type DataSourceThreadSafe = Arc<dyn DataSource + Send + Sync + 'static>;
pub struct DataConsumerActor {
    pub data_source: DataSourceThreadSafe,
    pub data_processor: DataProcessorThreadSafe,
    state: ConsumerActorState,
    sender: Option<Sender<DataConsumerRawType>>,
    pub(super) task_handle: Option<JoinHandle<()>>,
    actor_operation_state: ActorOperationStatus,
    last_processed_at: Option<DateTime<Utc>>,
    last_error: Option<String>,
}

impl DataConsumerActor {
    pub fn new(data_source: DataSourceThreadSafe, data_processor: DataProcessorThreadSafe) -> Self {
        DataConsumerActor {
            data_source,
            data_processor,
            state: ConsumerActorState::Idle,
            sender: None,
            task_handle: None,
            actor_operation_state: ActorOperationStatus::Idle,
            last_processed_at: None,
            last_error: None,
        }
    }
    pub fn data_source(&self) -> Arc<dyn DataSource + Send + Sync + 'static> {
        Arc::clone(&self.data_source)
    }
    pub fn data_processor(&self) -> Arc<dyn SendDataToProcessor + Send + Sync + 'static> {
        Arc::clone(&self.data_processor)
    }
    pub fn sender(&self) -> Option<Sender<DataConsumerRawType>> {
        self.sender.clone()
    }
    pub fn state(&self) -> ConsumerActorState {
        self.state.clone()
    }

    pub fn set_state(&mut self, state: ConsumerActorState) {
        self.state = state;
    }

    pub fn set_sender(&mut self, sender: Option<Sender<DataConsumerRawType>>) {
        self.sender = sender;
    }
    pub fn get_operation_state(&self) -> ActorOperationStatus {
        self.actor_operation_state.clone()
    }
    pub fn set_operation_state(&mut self, new_state: ActorOperationStatus) {
        self.actor_operation_state = new_state;
    }
    pub fn mark_processed(&mut self) {
        self.last_processed_at = Some(Utc::now());
    }
    pub fn mark_error(&mut self, msg: impl Into<String>) {
        self.last_error = Some(msg.into());
    }
    pub fn last_processed_at(&self) -> Option<DateTime<Utc>> {
        self.last_processed_at
    }
    pub fn last_error(&self) -> Option<&str> {
        self.last_error.as_deref()
    }
}

impl Actor for DataConsumerActor {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        LOGGER.info("DataConsumerActor started, sending StartConsuming message to self...");
        ctx.address()
            .do_send(ConsumerActorActionMessage::start_consuming());
        LOGGER.info("DataConsumerActor started, initiating data consumption...");
    }
    fn stopped(&mut self, _ctx: &mut Self::Context) {
        LOGGER.info("DataConsumerActor stopped.");
    }
    fn stopping(&mut self, ctx: &mut Self::Context) -> Running {
        LOGGER.info("DataConsumerActor stopping, sending StopConsuming message to self...");
        ctx.address()
            .do_send(ConsumerActorActionMessage::stop_consuming());
        LOGGER.info("DataConsumerActor stopping, initiating shutdown of data consumption...");
        Running::Stop
    }
}

//───brigde───────────────────────────────────────────────────────────────────────────

pub struct ConsumerActorBridge {
    addr: Addr<DataConsumerActor>,
}

impl ConsumerActorBridge {
    pub fn start_new_consumer_actor_with_impl(
        data_source: DataSourceThreadSafe,
        data_processor: DataProcessorThreadSafe,
    ) -> Arc<dyn SendActionToActor + Send + Sync> {
        let actor = DataConsumerActor::new(data_source, data_processor);
        let addr = actor.start();
        Arc::new(Self { addr })
    }
}

#[async_trait]
impl SendActionToActor for ConsumerActorBridge {
    async fn send_stop_actor(&self) -> SendActorActionMessageResult {
        self.addr
            .send(SendActorActionMessage::stop())
            .await
            .map_err(|e| PipelineLifecycleError::InternalCommunication {
                reason: format!("Failed to send stop message to consumer actor: {}", e),
            })?
    }

    async fn send_restart_actor(&self) -> SendActorActionMessageResult {
        self.addr
            .send(SendActorActionMessage::restart())
            .await
            .map_err(|e| PipelineLifecycleError::InternalCommunication {
                reason: format!("Failed to send restart message to consumer actor: {}", e),
            })?
    }

    async fn get_actor_operation_status(&self) -> GetActorOperationStatusMessageResult {
        self.addr
            .send(GetActorOperationStatusMessage)
            .await
            .map_err(|e| PipelineLifecycleError::InternalCommunication {
                reason: format!("Failed to send status message to consumer actor: {}", e),
            })?
    }

    async fn get_last_processed_at(&self) -> GetLastProcessedAtMessageResult {
        self.addr
            .send(GetLastProcessedAtMessage)
            .await
            .map_err(|e| PipelineLifecycleError::InternalCommunication {
                reason: format!(
                    "Failed to send last_processed_at message to consumer actor: {}",
                    e
                ),
            })?
    }

    async fn get_last_error(&self) -> GetLastErrorMessageResult {
        self.addr.send(GetLastErrorMessage).await.map_err(|e| {
            PipelineLifecycleError::InternalCommunication {
                reason: format!("Failed to send last_error message to consumer actor: {}", e),
            }
        })?
    }
}
