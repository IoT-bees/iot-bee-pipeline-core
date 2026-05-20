use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::{IoTBeeError, PipelineLifecycleError};
use domain::outbound::data_external_store::DataExternalStore;
use logging::AppLogger;

use actix::prelude::*;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use std::sync::Arc;

use super::super::general_messages::{
    GetActorOperationStatusMessage, GetActorOperationStatusMessageResult, GetLastErrorMessage,
    GetLastErrorMessageResult, GetLastProcessedAtMessage, GetLastProcessedAtMessageResult,
    SendActorActionMessage, SendActorActionMessageResult,
};
use super::super::general_ports::SendActionToActor;
use super::messages::SendDataToStoreMessage;

use domain::value_objects::lifecycle_values::ActorOperationStatus;

static LOGGER: AppLogger = AppLogger::new(
    "iot_bee::adapters::actor_system::pipeline_actor_module::store_actor::DataStoreActor",
);

pub type DataExternalStoreThreadSafe = Arc<dyn DataExternalStore + Send + Sync + 'static>;

// ── Actor ────────────────────────────────────────────────────────────────────
pub struct DataStoreActor {
    external_store: DataExternalStoreThreadSafe,
    internal_operation_state: ActorOperationStatus,
    last_processed_at: Option<DateTime<Utc>>,
    last_error: Option<String>,
}

impl DataStoreActor {
    pub fn new(external_store: DataExternalStoreThreadSafe) -> Self {
        Self {
            external_store,
            internal_operation_state: ActorOperationStatus::Idle,
            last_processed_at: None,
            last_error: None,
        }
    }
    pub fn external_store(&self) -> DataExternalStoreThreadSafe {
        Arc::clone(&self.external_store)
    }
    pub fn set_operation_state(&mut self, new_state: ActorOperationStatus) {
        self.internal_operation_state = new_state;
    }
    pub fn get_operation_state(&self) -> ActorOperationStatus {
        self.internal_operation_state.clone()
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

impl Actor for DataStoreActor {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        ctx.set_mailbox_capacity(1024);
        LOGGER.info("DataStoreActor started.");
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        LOGGER.info("DataStoreActor stopped.");
    }
}

//────Bridge────────────────────────────────────────────────────────────────────────────────────────────────
//
use super::super::general_ports::SendDataToStore;

#[derive(Clone)]
pub struct StoreActorBridge {
    addr: Addr<DataStoreActor>,
}
impl StoreActorBridge {
    pub fn start_new_store_actor_with_impl(
        external_store: DataExternalStoreThreadSafe,
    ) -> Arc<dyn SendDataToStore + Send + Sync> {
        //iniciar el actor usando supervisor
        let actor = DataStoreActor::new(Arc::clone(&external_store));
        let addr = actor.start();
        Arc::new(Self { addr })
    }
}

#[async_trait]
impl SendDataToStore for StoreActorBridge {
    async fn send(&self, data: &DataConsumerRawType) -> Result<(), IoTBeeError> {
        self.addr
            .send(SendDataToStoreMessage::new(&data))
            .await
            .map_err(|e| PipelineLifecycleError::InternalCommunication {
                reason: format!("Failed to send message to store actor: {}", e),
            })?
    }
}

#[async_trait]
impl SendActionToActor for StoreActorBridge {
    async fn send_stop_actor(&self) -> SendActorActionMessageResult {
        self.addr
            .send(SendActorActionMessage::stop())
            .await
            .map_err(|e| PipelineLifecycleError::InternalCommunication {
                reason: format!("Failed to send stop message to store actor: {}", e),
            })?
    }

    async fn send_restart_actor(&self) -> SendActorActionMessageResult {
        self.addr
            .send(SendActorActionMessage::restart())
            .await
            .map_err(|e| PipelineLifecycleError::InternalCommunication {
                reason: format!("Failed to send restart message to store actor: {}", e),
            })?
    }

    async fn get_actor_operation_status(&self) -> GetActorOperationStatusMessageResult {
        self.addr
            .send(GetActorOperationStatusMessage)
            .await
            .map_err(|e| PipelineLifecycleError::InternalCommunication {
                reason: format!("Failed to send status message to store actor: {}", e),
            })?
    }

    async fn get_last_processed_at(&self) -> GetLastProcessedAtMessageResult {
        self.addr
            .send(GetLastProcessedAtMessage)
            .await
            .map_err(|e| PipelineLifecycleError::InternalCommunication {
                reason: format!(
                    "Failed to send last_processed_at message to store actor: {}",
                    e
                ),
            })?
    }

    async fn get_last_error(&self) -> GetLastErrorMessageResult {
        self.addr.send(GetLastErrorMessage).await.map_err(|e| {
            PipelineLifecycleError::InternalCommunication {
                reason: format!("Failed to send last_error message to store actor: {}", e),
            }
        })?
    }
}
