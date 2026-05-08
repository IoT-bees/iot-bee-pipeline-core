use std::collections::HashMap;
use std::sync::{
    atomic::{AtomicU32, Ordering},
    Arc,
};

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

// ── ReplicaRegistry ───────────────────────────────────────────────────────────
//
// Vec<Arc<Controller>> protegido con RwLock.
// Cada elemento es una réplica del pipeline; el índice posicional la identifica.
// Se almacena Arc para poder clonar referencias antes de cualquier .await,
// garantizando que el RwLockGuard nunca se sostenga a través de un punto de
// suspensión asíncrona (lo que causaría un deadlock en tokio).
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

pub struct ReplicaRegistry {
    replicas: RwLock<HashMap<u32, Arc<PipelineAbstractionController>>>,
    next_id: AtomicU32,
}

impl ReplicaRegistry {
    pub fn new() -> Self {
        Self {
            replicas: RwLock::new(HashMap::new()),
            next_id: AtomicU32::new(1),
        }
    }

    async fn read_lock(
        &self,
    ) -> RwLockReadGuard<'_, HashMap<u32, Arc<PipelineAbstractionController>>> {
        self.replicas.read().await
    }

    async fn write_lock(
        &self,
    ) -> RwLockWriteGuard<'_, HashMap<u32, Arc<PipelineAbstractionController>>> {
        self.replicas.write().await
    }

    /// Clona todos los Arc liberando el lock inmediatamente.
    /// Usado por los handlers antes del .await para no sostener el guard.
    pub async fn all_arcs(&self) -> Vec<Arc<PipelineAbstractionController>> {
        let result = self.read_lock().await.values().cloned().collect();
        result
    }

    /// Devuelve pares (id, Arc) de todas las réplicas liberando el lock inmediatamente.
    /// Permite al handler identificar qué réplicas limpiar del registro individualmente.
    pub async fn all_entries(&self) -> Vec<(u32, Arc<PipelineAbstractionController>)> {
        self.read_lock()
            .await
            .iter()
            .map(|(&id, arc)| (id, Arc::clone(arc)))
            .collect()
    }

    /// Añade réplicas asignando un id único a cada una.
    /// Devuelve los ids asignados en el mismo orden que los controladores recibidos.
    pub async fn add_replica(&self, controllers: Vec<PipelineAbstractionController>) -> Vec<u32> {
        let mut replicas = self.write_lock().await;
        let mut ids = Vec::with_capacity(controllers.len());
        for c in controllers {
            let id = self.next_id.fetch_add(1, Ordering::SeqCst);
            replicas.insert(id, Arc::new(c));
            ids.push(id);
        }
        ids
    }

    /// Obtiene una réplica por su id interno.
    pub async fn get_replica(
        &self,
        id: u32,
    ) -> Result<Arc<PipelineAbstractionController>, IoTBeeError> {
        self.read_lock().await.get(&id).cloned().ok_or_else(|| {
            PipelineLifecycleError::OperationFailed {
                reason: format!("No hay réplica con id={}", id),
            }
            .into()
        })
    }

    /// Elimina una réplica por su id interno. Error si el id no existe.
    pub async fn remove_replica(&self, id: u32) -> Result<(), IoTBeeError> {
        let mut replicas = self.write_lock().await;
        if replicas.remove(&id).is_none() {
            return Err(PipelineLifecycleError::OperationFailed {
                reason: format!("No hay réplica con id={} para eliminar", id),
            }
            .into());
        }
        Ok(())
    }

    /// Elimina todos los registros del mapa (usado tras un stop exitoso).
    pub async fn clear(&self) {
        self.write_lock().await.clear();
    }

    /// Devuelve el número actual de réplicas.
    pub async fn replica_count(&self) -> usize {
        self.read_lock().await.len()
    }
}
