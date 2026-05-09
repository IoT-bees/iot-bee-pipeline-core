use actix::prelude::*;
use async_trait::async_trait;

use super::messages::ProcessDataMessage;
use crate::actor_system::pipeline_actor_module::general_ports::SendDataToProcessor;
use crate::actor_system::pipeline_actor_module::general_ports::SendDataToStore;

use super::super::general_messages::{
     GetActorOperationStatusMessage, GetActorOperationStatusMessageResult,
    SendActorActionMessage, SendActorActionMessageResult,
};
use domain::value_objects::lifecycle_values::{
  ActorOperationStatus,
};
use super::super::general_ports::SendActionToActor;

use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::{IoTBeeError, PipelineLifecycleError};
use domain::outbound::data_processor_actions::DataProcessorActions;
use logging::AppLogger;
use std::sync::Arc;

static LOGGER: AppLogger = AppLogger::new(
    "iot_bee::adapters::actor_system::pipeline_actor_module::processor_actor::DataProcessorActor",
);

// ── Actor ────────────────────────────────────────────────────────────────────
type DataStoreThreadSafe = Arc<dyn SendDataToStore + Send + Sync + 'static>;
type DataProcessorActionsThreadSafe = Arc<dyn DataProcessorActions + Send + Sync + 'static>;
pub struct DataProcessorActor {
    data_store: DataStoreThreadSafe,
    data_processor_actions: DataProcessorActionsThreadSafe,
    operation_state: ActorOperationStatus,
}

impl DataProcessorActor {
    pub fn new(
        data_store: DataStoreThreadSafe,
        data_processor: DataProcessorActionsThreadSafe,
    ) -> Self {
        Self {
            data_store,
            data_processor_actions: data_processor,
            operation_state: ActorOperationStatus::Idle,
        }
    }
    pub fn data_store(&self) -> DataStoreThreadSafe {
        Arc::clone(&self.data_store)
    }
    pub fn data_processor_actions(&self) -> DataProcessorActionsThreadSafe {
        Arc::clone(&self.data_processor_actions)
    }
    pub fn set_operation_state(&mut self, new_state: ActorOperationStatus) {
        self.operation_state = new_state;
    }
    pub fn get_operation_state(&self) -> ActorOperationStatus {
        self.operation_state
    }
}

impl Actor for DataProcessorActor {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {
        LOGGER.info("DataProcessorActor started.");
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        LOGGER.info("DataProcessorActor stopped.");
    }
}

// ── Bridge ───────────────────────────────────────────────────────────────────
// Adapta Addr<DataProcessorActor> al trait SendDataToProcessor.
// El consumer nunca conoce al actor; solo conoce el trait.
//──────────────────────────────────────────────────────────────────────────────
#[derive(Clone)]
pub struct ProcessorActorBridge {
    addr: Addr<DataProcessorActor>,
}
//este es el que debo inyectar en el consumer actor para que pueda enviarle datos al processor actor sin conocerlo directamente.
impl ProcessorActorBridge {
    pub fn start_new_processor_actor_with_impl(
        data_store: DataStoreThreadSafe,
        data_processor: DataProcessorActionsThreadSafe,
    ) -> Arc<dyn SendDataToProcessor + Send + Sync> {
        let actor = DataProcessorActor::new(data_store, data_processor);
        let addr = actor.start();
        Arc::new(Self { addr })
    }
}

#[async_trait]
impl SendDataToProcessor for ProcessorActorBridge {
    async fn send(&self, data: &DataConsumerRawType) -> Result<(), IoTBeeError> {
        self.addr
            .send(ProcessDataMessage::new(data.clone()))
            .await
            .map_err(|e| PipelineLifecycleError::InternalCommunication {
                reason: format!("Failed to send message to processor actor: {}", e),
            })?
    }
}

#[async_trait]
impl SendActionToActor for ProcessorActorBridge {
    async fn send_stop_actor(&self) -> SendActorActionMessageResult {
        self.addr
            .send(SendActorActionMessage::stop())
            .await
            .map_err(|e| PipelineLifecycleError::InternalCommunication {
                reason: format!("Failed to send stop message to processor actor: {}", e),
            })?
    }

    async fn send_restart_actor(&self) -> SendActorActionMessageResult {
        self.addr
            .send(SendActorActionMessage::restart())
            .await
            .map_err(|e| PipelineLifecycleError::InternalCommunication {
                reason: format!("Failed to send restart message to processor actor: {}", e),
            })?
    }

    async fn get_actor_operation_status(&self) -> GetActorOperationStatusMessageResult {
        self.addr
            .send(GetActorOperationStatusMessage)
            .await
            .map_err(|e| PipelineLifecycleError::InternalCommunication {
                reason: format!(
                    "Failed to send get status message to processor actor: {}",
                    e
                ),
            })?
    }
}

//────────────────────────────────────────────────────────────────────────────────────────────────────────
