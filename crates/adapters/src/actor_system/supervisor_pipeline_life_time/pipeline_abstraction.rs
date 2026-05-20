use std::sync::Arc;

use super::super::pipeline_actor_module::general_ports::SendActionToActor;
use chrono::{DateTime, Utc};
use domain::error::{IoTBeeError, PipelineLifecycleError};
// use crate::adapters::actor_system::pipeline_actor_module::general_messages::{ResponseActorActionMessage, ActorStatus};
/// Resultado de una operación de ciclo de vida sobre un trío (consumer, processor, store).
use domain::value_objects::lifecycle_values::PipelinepartsStatus;

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

    pub async fn status(&self) -> Result<PipelinepartsStatus, IoTBeeError> {
        let consumer_arc = match self.consumer.lock().await.as_ref() {
            Some(consumer) => Arc::clone(consumer),
            None => {
                return Err(PipelineLifecycleError::OperationFailed {
                    reason: "Consumer actor is missing, cannot determine status".to_string(),
                }
                .into());
            }
        };

        let processor_arc = match self.processor.lock().await.as_ref() {
            Some(processor) => Arc::clone(processor),
            None => {
                return Err(PipelineLifecycleError::OperationFailed {
                    reason: "Processor actor is missing, cannot determine status".to_string(),
                }
                .into());
            }
        };

        let store_arc = match self.store.lock().await.as_ref() {
            Some(store) => Arc::clone(store),
            None => {
                return Err(PipelineLifecycleError::OperationFailed {
                    reason: "Store actor is missing, cannot determine status".to_string(),
                }
                .into());
            }
        };

        let consumer_status = consumer_arc.get_actor_operation_status().await?;
        let processor_status = processor_arc.get_actor_operation_status().await?;
        let store_status = store_arc.get_actor_operation_status().await?;

        let (last_processed_at, last_error) =
            Self::collect_telemetry(&consumer_arc, &processor_arc, &store_arc).await;

        Ok(
            PipelinepartsStatus::new(consumer_status, processor_status, store_status)
                .with_telemetry(last_processed_at, last_error),
        )
    }

    async fn collect_telemetry(
        consumer: &Arc<dyn SendActionToActor + Send + Sync>,
        processor: &Arc<dyn SendActionToActor + Send + Sync>,
        store: &Arc<dyn SendActionToActor + Send + Sync>,
    ) -> (Option<DateTime<Utc>>, Option<String>) {
        let last_processed_at = match store.get_last_processed_at().await {
            Ok(Some(ts)) => Some(ts),
            _ => processor.get_last_processed_at().await.ok().flatten(),
        };

        let last_error = match consumer.get_last_error().await.ok().flatten() {
            Some(e) => Some(e),
            None => match processor.get_last_error().await.ok().flatten() {
                Some(e) => Some(e),
                None => store.get_last_error().await.ok().flatten(),
            },
        };

        (last_processed_at, last_error)
    }
}
