use actix::prelude::*;

use super::messges::{
    AddReplicaMessage, RemoveReplicaMessage, ReplicaCountMessage, RestartAllReplicasMessage,
    StartPipelineMessage, StatusAllReplicasMessage, StopAllReplicasMessage,
};
// use super::pipeline_abstraction::AllReplicasResult;
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

    fn handle(&mut self, _msg: StartPipelineMessage, _ctx: &mut Context<Self>) -> Self::Result {
        let replica_count = self.pipeline_configuration().pipeline_replication();
        let data_store = self.data_store();
        let data_source = self.data_source();
        let data_processor = self.data_processor();
        let registry = self.replica_registry();

        LOGGER.info(&format!(
            "Iniciando pipeline con {} réplicas...",
            replica_count
        ));
        Box::pin(async move {
            // Crear todas las réplicas en paralelo
            let mut tasks = Vec::new();

            for _ in 0..replica_count {
                let data_store = data_store.clone();
                let data_source = data_source.clone();
                let data_processor = data_processor.clone();
                let task = actix::spawn(async move {
                    //TODO: implementar a futuro un result en los estart para validar que el actor que inicia esta completamente sano.
                    let store = StoreActorBridge::start_new_store_actor_with_impl(data_store);
                    let processor = ProcessorActorBridge::start_new_processor_actor_with_impl(
                        store.clone(),
                        data_processor,
                    );
                    let consumer = ConsumerActorBridge::start_new_consumer_actor_with_impl(
                        data_source,
                        Arc::clone(&processor),
                    );
                    // let pipeline = PipelineAbstractionController::new(consumer, processor, store);
                    // registry.add_replica(pipeline).await
                    Ok::<_, IoTBeeError>(PipelineAbstractionController::new(
                        consumer, processor, store,
                    ))
                });
                tasks.push(task);
            }

            // recolecta todos los resultados sin insertar aún
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

            // si alguna falló — limpias todo antes de insertar
            if !errors.is_empty() {
                for pipeline in pipelines {
                    pipeline.stop().await.ok(); // limpieza explícita de las que sí crearon
                }
                return Err(errors.remove(0));
            }

            // si todas fueron exitosas, las insertas al registro
            registry.add_replica(pipelines).await;

            Ok(())
        })
    }
}

// ── StopAllReplicas ── asíncrono ──────────────────────────────────────────────
//
// Patrón: all_arcs() clona los Arc y libera el RwLock en la parte síncrona
// del handler, ANTES de entrar en Box::pin(async move {}).
// El mailbox sigue procesando mensajes mientras el future recorre las réplicas.

impl Handler<StopAllReplicasMessage> for PipelineSupervisor {
    type Result = ResponseFuture<Result<(), IoTBeeError>>;

    fn handle(&mut self, _msg: StopAllReplicasMessage, _ctx: &mut Context<Self>) -> Self::Result {
        let replica_registry = self.replica_registry();

        Box::pin(async move {
            let mut result_vector: Vec<Result<(), IoTBeeError>> = Vec::new();
            let replicas = replica_registry.all_arcs().await;

            for replica in replicas {
                let stop_result = replica.stop().await;
                result_vector.push(stop_result);
            }
            // Combinar los resultados individuales en un solo resultado
            for result in result_vector {
                if let Err(e) = result {
                    return Err(e);
                }
            }

            Ok(())
        })
    }
}

// ── RemoveReplica ── asíncrono ───────────────────────────────────────────
impl Handler<RemoveReplicaMessage> for PipelineSupervisor {
    type Result = ResponseFuture<Result<(), IoTBeeError>>;

    fn handle(&mut self, _msg: RemoveReplicaMessage, _ctx: &mut Context<Self>) -> Self::Result {
        // para remover una replica primero se debe obtener el pipeline y detenerlo, luego se remueve del registro de replicas
        let replica_registry = self.replica_registry();

        Box::pin(async move {
            let replica = match replica_registry.get_last_replica().await {
                Ok(r) => r,
                Err(e) => return Err(e),
            };
            replica.stop().await?;
            replica_registry.remove_last_replica().await
        })
    }
}

// ── AddReplica ── síncrono ────────────────────────────────────────────────────

impl Handler<AddReplicaMessage> for PipelineSupervisor {
    type Result = Result<usize, IoTBeeError>;

    fn handle(&mut self, _msg: AddReplicaMessage, _ctx: &mut Context<Self>) -> Self::Result {
        Ok(0 as usize)
        // self.replica_registry().add_replica(msg.controller).await
    }
}

// ── RemoveReplica ── síncrono ─────────────────────────────────────────────────

// ── ReplicaCount ── síncrono ──────────────────────────────────────────────────

impl Handler<ReplicaCountMessage> for PipelineSupervisor {
    type Result = Result<usize, IoTBeeError>;

    fn handle(&mut self, _msg: ReplicaCountMessage, _ctx: &mut Context<Self>) -> Self::Result {
        Ok(0 as usize)
        // self.replica_registry().replica_count()
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
