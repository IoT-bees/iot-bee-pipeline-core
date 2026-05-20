use actix::prelude::*;

use super::messges::{
    InternalInsertReplicasMessage, InternalReInsertReplicasMessage, ReplicaCountMessage,
    RestartAllReplicasMessage, StartAllPipelinesMessage, StartPipelineMessage,
    StatusAllReplicasMessage, StatusAllReplicasMessageResult, StopAllReplicasMessage,
    StopPipelineMessage, UpdateReplicationFactorMessage,
};
use super::pipeline_abstraction::PipelineAbstractionController;
use super::pipeline_supervisor::PipelineSupervisor;
use crate::actor_system::pipeline_actor_module::{
    consumer_actor::data_consumer_actor::ConsumerActorBridge,
    processor_actor::data_processor_actor::ProcessorActorBridge,
    store_actor::data_store_actor::StoreActorBridge,
};
use domain::error::{IoTBeeError, PipelineLifecycleError};
use domain::value_objects::lifecycle_values::PipelineStatusReport;
use std::collections::HashMap;
// use domain::value_objects::lifecycle_values::PipelinepartsStatus;

use std::sync::Arc;

use logging::AppLogger;
static LOGGER: AppLogger = AppLogger::new("supervisor_pipeline_life_time::handlers");

// ── StartPipeline (una sola réplica) ──────────────────────────────────────────
impl Handler<StartPipelineMessage> for PipelineSupervisor {
    type Result = ResponseFuture<Result<(), IoTBeeError>>;

    fn handle(&mut self, _msg: StartPipelineMessage, ctx: &mut Context<Self>) -> Self::Result {
        let data_store = self.data_store();
        let data_source = self.data_source();
        let data_processor = self.data_processor();
        let self_addr = ctx.address();

        Box::pin(async move {
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

            match task.await {
                Ok(Ok(pipeline)) => self_addr
                    .send(InternalInsertReplicasMessage(vec![pipeline]))
                    .await
                    .map_err(|e| {
                        IoTBeeError::from(PipelineLifecycleError::InternalCommunication {
                            reason: e.to_string(),
                        })
                    })?,
                Ok(Err(e)) => Err(e),
                Err(e) => Err(PipelineLifecycleError::OperationFailed {
                    reason: e.to_string(),
                }
                .into()),
            }
        })
    }
}

// ── StartAllPipelines ─────────────────────────────────────────────────────────
// Envía StartPipelineMessage tantas veces como indique el factor de replicación.
impl Handler<StartAllPipelinesMessage> for PipelineSupervisor {
    type Result = ResponseFuture<Result<(), IoTBeeError>>;

    fn handle(&mut self, _msg: StartAllPipelinesMessage, ctx: &mut Context<Self>) -> Self::Result {
        let replica_count = self.pipeline_configuration().pipeline_replication();
        let self_addr = ctx.address();

        LOGGER.info(&format!(
            "Iniciando pipeline con {} réplicas...",
            replica_count
        ));
        Box::pin(async move {
            for _ in 0..replica_count {
                self_addr.send(StartPipelineMessage).await.map_err(|e| {
                    IoTBeeError::from(PipelineLifecycleError::InternalCommunication {
                        reason: e.to_string(),
                    })
                })??;
            }
            Ok(())
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
            let id = self.next_available_id();
            self.replicas.insert(id, Arc::new(c));
        }
        LOGGER.info(&format!(
            "Réplicas insertadas, total activas: {}",
            self.replicas.len()
        ));
        Ok(())
    }
}

// ── StopPipeline (una sola réplica) ──────────────────────────────────────────
//
// Extrae la réplica del mapa de forma síncrona y la para de forma asíncrona.
// Si la parada falla, re-inserta la réplica vía InternalReInsertReplicasMessage.

impl Handler<StopPipelineMessage> for PipelineSupervisor {
    type Result = ResponseFuture<Result<(), IoTBeeError>>;

    fn handle(&mut self, msg: StopPipelineMessage, ctx: &mut Context<Self>) -> Self::Result {
        let id = msg.0;
        let replica = self.replicas.remove(&id);
        let self_addr = ctx.address();

        Box::pin(async move {
            match replica {
                None => Err(PipelineLifecycleError::OperationFailed {
                    reason: format!("Réplica con id {} no encontrada", id),
                }
                .into()),
                Some(r) => match r.stop().await {
                    Ok(()) => Ok(()),
                    Err(e) => {
                        self_addr
                            .send(InternalReInsertReplicasMessage(vec![(id, r)]))
                            .await
                            .ok();
                        Err(e)
                    }
                },
            }
        })
    }
}

// ── StopAllReplicas ── asíncrono ──────────────────────────────────────────────
//
// Recoge todos los ids activos y delega en StopPipelineMessage uno a uno.
// Si alguna falla, StopPipelineMessage se encarga de re-insertarla.

impl Handler<StopAllReplicasMessage> for PipelineSupervisor {
    type Result = ResponseFuture<Result<(), IoTBeeError>>;

    fn handle(&mut self, _msg: StopAllReplicasMessage, ctx: &mut Context<Self>) -> Self::Result {
        let ids: Vec<u32> = self.replicas.keys().cloned().collect();
        let self_addr = ctx.address();

        Box::pin(async move {
            let mut errors: Vec<String> = Vec::new();

            for id in ids {
                if let Err(e) = self_addr
                    .send(StopPipelineMessage(id))
                    .await
                    .map_err(|e| {
                        IoTBeeError::from(PipelineLifecycleError::InternalCommunication {
                            reason: e.to_string(),
                        })
                    })
                    .and_then(|r| r)
                {
                    errors.push(e.to_string());
                }
            }

            if errors.is_empty() {
                Ok(())
            } else {
                Err(PipelineLifecycleError::OperationFailed {
                    reason: format!(
                        "{} réplica(s) no pudieron detenerse: {:?}",
                        errors.len(),
                        errors
                    ),
                }
                .into())
            }
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

    fn handle(&mut self, _msg: RestartAllReplicasMessage, ctx: &mut Context<Self>) -> Self::Result {
        let self_addr = ctx.address();
        Box::pin(async move {
            self_addr.send(StopAllReplicasMessage).await.map_err(|e| {
                IoTBeeError::from(PipelineLifecycleError::InternalCommunication {
                    reason: e.to_string(),
                })
            })??;
            self_addr
                .send(StartAllPipelinesMessage)
                .await
                .map_err(|e| {
                    IoTBeeError::from(PipelineLifecycleError::InternalCommunication {
                        reason: e.to_string(),
                    })
                })??;
            Ok(())
        })
    }
}

// ── StatusAllReplicas ── asíncrono ────────────────────────────────────────────

impl Handler<StatusAllReplicasMessage> for PipelineSupervisor {
    type Result = ResponseFuture<StatusAllReplicasMessageResult>;

    fn handle(&mut self, _msg: StatusAllReplicasMessage, _ctx: &mut Context<Self>) -> Self::Result {
        let replicas: Vec<(u32, Arc<PipelineAbstractionController>)> = self
            .replicas
            .iter()
            .map(|(id, r)| (*id, Arc::clone(r)))
            .collect();

        Box::pin(async move {
            let mut status_map = HashMap::new();
            for (id, replica) in replicas {
                let status = replica.status().await?;
                status_map.insert(id, status);
            }
            Ok(PipelineStatusReport::new(status_map))
        })
    }
}

use std::cmp::Ordering;

impl Handler<UpdateReplicationFactorMessage> for PipelineSupervisor {
    type Result = ResponseFuture<Result<(), IoTBeeError>>;

    fn handle(
        &mut self,
        msg: UpdateReplicationFactorMessage,
        ctx: &mut Context<Self>,
    ) -> Self::Result {
        let new_factor = msg.replication_factor() as usize;
        let current_count = self.replicas.len();
        let self_addr = ctx.address();

        // Recogemos los ids a eliminar de forma síncrona antes de entrar al bloque async.
        // Se toman los ids más altos primero para mantener la consistencia en la numeración.
        let ids_to_remove: Vec<u32> = if new_factor < current_count {
            let to_remove = current_count - new_factor;
            let mut keys: Vec<u32> = self.replicas.keys().cloned().collect();
            keys.sort_unstable_by(|a, b| b.cmp(a));
            keys.into_iter().take(to_remove).collect()
        } else {
            Vec::new()
        };

        Box::pin(async move {
            if new_factor == 0 {
                return self_addr.send(StopAllReplicasMessage).await.map_err(|e| {
                    IoTBeeError::from(PipelineLifecycleError::InternalCommunication {
                        reason: e.to_string(),
                    })
                })?;
            }

            match new_factor.cmp(&current_count) {
                Ordering::Greater => {
                    let to_add = new_factor - current_count;
                    LOGGER.info(&format!(
                        "Escalando pipeline: agregando {} réplica(s).",
                        to_add
                    ));
                    for _ in 0..to_add {
                        self_addr.send(StartPipelineMessage).await.map_err(|e| {
                            IoTBeeError::from(PipelineLifecycleError::InternalCommunication {
                                reason: e.to_string(),
                            })
                        })??;
                    }
                }
                Ordering::Less => {
                    let to_remove = ids_to_remove.len();
                    LOGGER.info(&format!(
                        "Escalando pipeline: eliminando {} réplica(s).",
                        to_remove
                    ));
                    for id in ids_to_remove {
                        self_addr
                            .send(StopPipelineMessage(id))
                            .await
                            .map_err(|e| {
                                IoTBeeError::from(PipelineLifecycleError::InternalCommunication {
                                    reason: e.to_string(),
                                })
                            })??;
                    }
                }
                Ordering::Equal => {
                    LOGGER.info(&format!(
                        "El número de réplicas ya es {}. No se realizarán cambios.",
                        current_count
                    ));
                }
            }
            Ok(())
        })
    }
}
