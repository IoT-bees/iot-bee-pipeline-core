use std::sync::Arc;

use super::super::pipeline_actor_module::general_messages::SendActorActionMessageResult;
use super::super::pipeline_actor_module::general_ports::SendActionToActor;
use domain::error::{IoTBeeError, PipelineLifecycleError};
// use crate::adapters::actor_system::pipeline_actor_module::general_messages::{ResponseActorActionMessage, ActorStatus};
/// Resultado de una operación de ciclo de vida sobre un trío (consumer, processor, store).
pub type TripleResult = (
    SendActorActionMessageResult,
    SendActorActionMessageResult,
    SendActorActionMessageResult,
);

/// Resultado de una operación de ciclo de vida sobre todas las réplicas activas.
pub type AllReplicasResult = Vec<TripleResult>;

// ── PipelineAbstractionController ─────────────────────────────────────────────
//
// Representa un trío de actores (consumer, processor, store) para una réplica.
// Las acciones de ciclo de vida se delegan a los tres en orden.

use tokio::sync::Mutex;

pub struct PipelineAbstractionController {
    consumer: Mutex<Option<Arc<dyn SendActionToActor + Send + Sync>>>,
    processor: Mutex<Option<Arc<dyn SendActionToActor + Send + Sync>>>,
    store: Mutex<Option<Arc<dyn SendActionToActor + Send + Sync>>>,
}

impl PipelineAbstractionController {
    pub fn new(
        consumer: Arc<dyn SendActionToActor + Send + Sync>,
        processor: Arc<dyn SendActionToActor + Send + Sync>,
        store: Arc<dyn SendActionToActor + Send + Sync>,
    ) -> Self {
        Self {
            consumer: Mutex::new(Some(consumer)),
            processor: Mutex::new(Some(processor)),
            store: Mutex::new(Some(store)),
        }
    }

    pub async fn stop(&self) -> Result<(), IoTBeeError> {
        let mut failures = Vec::new();

        if let Some(consumer) = self.consumer.lock().await.take() {
            if let Err(e) = consumer.send_stop_actor().await {
                failures.push(("consumer", e.to_string()));
                *self.consumer.lock().await = Some(consumer); // reponer el consumer para intentar detener los otros actores
            }
        }

        if let Some(processor) = self.processor.lock().await.take() {
            if let Err(e) = processor.send_stop_actor().await {
                failures.push(("processor", e.to_string()));
                *self.processor.lock().await = Some(processor); // reponer el processor para intentar detener los otros actores
            }
        }

        if let Some(store) = self.store.lock().await.take() {
            if let Err(e) = store.send_stop_actor().await {
                failures.push(("store", e.to_string()));
                *self.store.lock().await = Some(store); // reponer el store para intentar detener los otros actores
            }
        }

        if failures.is_empty() {
            Ok(())
        } else {
            Err(PipelineLifecycleError::OperationFailed {
                reason: format!("Failed when stopping actors: {:?}", failures),
            }
            .into())
        }
    }

    pub async fn pipeline_stopped(&self) -> bool {
        self.consumer.lock().await.is_none()
            && self.processor.lock().await.is_none()
            && self.store.lock().await.is_none()
    }

    pub async fn restart(&self) -> Result<(), IoTBeeError> {
        Ok(())
    }

    pub async fn status(&self) -> Result<(), IoTBeeError> {
        Ok(())
    }
}
