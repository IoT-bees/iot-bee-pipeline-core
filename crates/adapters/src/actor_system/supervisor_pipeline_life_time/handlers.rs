use actix::prelude::*;

use super::messges::{
    AddReplicaMessage, InternalInsertReplicasMessage, InternalReInsertReplicasMessage,
    RemoveReplicaMessage, ReplicaCountMessage, RestartAllReplicasMessage, StartPipelineMessage,
    StatusAllReplicasMessage, StopAllReplicasMessage,
};
use super::pipeline_supervisor::PipelineSupervisor;
use domain::error::{IoTBeeError, PipelineLifecycleError};

use super::pipeline_abstraction::PipelineAbstractionController;
use crate::actor_system::pipeline_actor_module::{
    consumer_actor::data_consumer_actor::ConsumerActorBridge,
    processor_actor::data_processor_actor::ProcessorActorBridge,
    store_actor::data_store_actor::StoreActorBridge,
};
use std::sync::Arc;

use logging::AppLogger;
static LOGGER: AppLogger = AppLogger::new("supervisor_pipeline_life_time::handlers");

// ── StartPipeline ─────────────────────────────────────────────
impl Handler<StartPipelineMessage> for PipelineSupervisor {
    type Result = ResponseFuture<Result<(), IoTBeeError>>;

    fn handle(&mut self, _msg: StartPipelineMessage, ctx: &mut Context<Self>) -> Self::Result {
        let replica_count = self.pipeline_configuration().pipeline_replication();
        let data_store = self.data_store();
        let data_source = self.data_source();
        let data_processor = self.data_processor();
        let self_addr = ctx.address();

        LOGGER.info(&format!(
            "Iniciando pipeline con {} réplicas...",
            replica_count
        ));
        Box::pin(async move {
            let mut tasks = Vec::new();

            for _ in 0..replica_count {
                let data_store = data_store.clone();
                let data_source = data_source.clone();
                let data_processor = data_processor.clone();
                let task = actix::spawn(async move {
                    //TODO: implementar a futuro un result en los start para validar que el actor que inicia está completamente sano.
                    let store = StoreActorBridge::start_new_store_actor_with_impl(data_store);
                    let processor = ProcessorActorBridge::start_new_processor_actor_with_impl(
                        store.clone(),
                        data_processor,
                    );
                    let consumer = ConsumerActorBridge::start_new_consumer_actor_with_impl(
                        data_source,
                        Arc::clone(&processor),
                    );
                    Ok::<_, IoTBeeError>(PipelineAbstractionController::new(
                        consumer, processor, store,
                    ))
                });
                tasks.push(task);
            }

            let mut pipelines = Vec::new();
            let mut errors: Vec<IoTBeeError> = Vec::new();

            for task in tasks {
                match task.await {
                    Ok(Ok(pipeline)) => pipelines.push(pipeline),
                    Ok(Err(e)) => errors.push(e),
                    Err(e) => errors.push(
                        PipelineLifecycleError::OperationFailed {
                            reason: e.to_string(),
                        }
                        .into(),
                    ),
                }
            }

            if !errors.is_empty() {
                for pipeline in pipelines {
                    pipeline.stop().await.ok();
                }
                return Err(errors.remove(0));
            }

            // Insertar réplicas en el actor vía mensaje síncrono a self
            self_addr
                .send(InternalInsertReplicasMessage(pipelines))
                .await
                .map_err(|e| {
                    IoTBeeError::from(PipelineLifecycleError::InternalCommunication {
                        reason: e.to_string(),
                    })
                })?
        })
    }
}

// ── InternalInsertReplicas ── síncrono ────────────────────────────────────────
//
// Recibe los controllers creados en el async de StartPipeline y los inserta
// en self.replicas. Sin locks: el mailbox garantiza acceso exclusivo a &mut self.

impl Handler<InternalInsertReplicasMessage> for PipelineSupervisor {
    type Result = Result<(), IoTBeeError>;

    fn handle(
        &mut self,
        msg: InternalInsertReplicasMessage,
        _ctx: &mut Context<Self>,
    ) -> Self::Result {
        for c in msg.0 {
            let id = self.next_replica_id;
            self.next_replica_id += 1;
            self.replicas.insert(id, Arc::new(c));
        }
        LOGGER.info(&format!(
            "Réplicas insertadas, total activas: {}",
            self.replicas.len()
        ));
        Ok(())
    }
}

// ── StopAllReplicas ── asíncrono ──────────────────────────────────────────────
//
// Patrón actor-owned:
//   1. Sync: drain de self.replicas → mapa vacío al instante, sin locks.
//   2. Async: se para cada réplica de forma independiente.
//   3. Las que fallen se re-insertan vía InternalReInsertReplicasMessage,
//      de modo que un reintento sólo ve las réplicas que aún no pudieron pararse.

impl Handler<StopAllReplicasMessage> for PipelineSupervisor {
    type Result = ResponseFuture<Result<(), IoTBeeError>>;

    fn handle(&mut self, _msg: StopAllReplicasMessage, ctx: &mut Context<Self>) -> Self::Result {
        let entries: Vec<(u32, Arc<PipelineAbstractionController>)> =
            self.replicas.drain().collect();
        let self_addr = ctx.address();

        Box::pin(async move {
            let mut failed: Vec<(u32, Arc<PipelineAbstractionController>)> = Vec::new();
            let mut errors: Vec<String> = Vec::new();

            for (id, replica) in entries {
                match replica.stop().await {
                    Ok(()) => {}
                    Err(e) => {
                        failed.push((id, replica));
                        errors.push(e.to_string());
                    }
                }
            }

            if failed.is_empty() {
                return Ok(());
            }

            // Re-insertar las que fallaron para que el próximo intento las vea
            self_addr
                .send(InternalReInsertReplicasMessage(failed))
                .await
                .ok();

            Err(PipelineLifecycleError::OperationFailed {
                reason: format!(
                    "{} réplica(s) no pudieron detenerse: {:?}",
                    errors.len(),
                    errors
                ),
            }
            .into())
        })
    }
}

// ── InternalReInsertReplicas ── síncrono ──────────────────────────────────────
//
// Restaura en self.replicas las réplicas que no pudieron detenerse,
// conservando sus ids originales para que el estado sea coherente.

impl Handler<InternalReInsertReplicasMessage> for PipelineSupervisor {
    type Result = ();

    fn handle(
        &mut self,
        msg: InternalReInsertReplicasMessage,
        _ctx: &mut Context<Self>,
    ) -> Self::Result {
        for (id, arc) in msg.0 {
            self.replicas.insert(id, arc);
        }
    }
}

// ── RemoveReplica ── asíncrono ───────────────────────────────────────────
//
// Sync: extrae la réplica de self.replicas (ya no está en el mapa).
// Async: la detiene. Si falla, la devuelve vía InternalReInsertReplicas.

impl Handler<RemoveReplicaMessage> for PipelineSupervisor {
    type Result = ResponseFuture<Result<(), IoTBeeError>>;

    fn handle(&mut self, msg: RemoveReplicaMessage, ctx: &mut Context<Self>) -> Self::Result {
        let id = msg.replica_id();
        let replica = match self.replicas.remove(&id) {
            Some(r) => r,
            None => {
                return Box::pin(async move {
                    Err(PipelineLifecycleError::OperationFailed {
                        reason: format!("No hay réplica con id={}", id),
                    }
                    .into())
                });
            }
        };
        let self_addr = ctx.address();

        Box::pin(async move {
            match replica.stop().await {
                Ok(()) => Ok(()),
                Err(e) => {
                    self_addr
                        .send(InternalReInsertReplicasMessage(vec![(id, replica)]))
                        .await
                        .ok();
                    Err(e)
                }
            }
        })
    }
}

// ── AddReplica ── síncrono ────────────────────────────────────────────────────
//
// Inserta un controller directamente en self.replicas. Sin async, sin locks.

impl Handler<AddReplicaMessage> for PipelineSupervisor {
    type Result = Result<usize, IoTBeeError>;

    fn handle(&mut self, msg: AddReplicaMessage, _ctx: &mut Context<Self>) -> Self::Result {
        let id = self.next_replica_id;
        self.next_replica_id += 1;
        self.replicas.insert(id, Arc::new(msg.controller));
        Ok(self.replicas.len())
    }
}

// ── ReplicaCount ── síncrono ──────────────────────────────────────────────────

impl Handler<ReplicaCountMessage> for PipelineSupervisor {
    type Result = Result<usize, IoTBeeError>;

    fn handle(&mut self, _msg: ReplicaCountMessage, _ctx: &mut Context<Self>) -> Self::Result {
        Ok(self.replicas.len())
    }
}

// ── RestartAllReplicas ── asíncrono ───────────────────────────────────────────

impl Handler<RestartAllReplicasMessage> for PipelineSupervisor {
    type Result = ResponseFuture<Result<(), IoTBeeError>>;

    fn handle(
        &mut self,
        _msg: RestartAllReplicasMessage,
        _ctx: &mut Context<Self>,
    ) -> Self::Result {
        Box::pin(async move { Ok(()) })
    }
}

// ── StatusAllReplicas ── asíncrono ────────────────────────────────────────────

impl Handler<StatusAllReplicasMessage> for PipelineSupervisor {
    type Result = ResponseFuture<Result<(), IoTBeeError>>;

    fn handle(&mut self, _msg: StatusAllReplicasMessage, _ctx: &mut Context<Self>) -> Self::Result {
        Box::pin(async move { Ok(()) })
    }
}
