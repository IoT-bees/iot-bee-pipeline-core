use actix::prelude::*;

// use super::super::supervisor_pipeline_life_time::pipeline_abstraction::AllReplicasResult;
use super::super::supervisor_pipeline_life_time::{
    actor_wrapper::SupervisorPipelineBridge,
    // pipeline_supervisor::PipelineSupervisor,
};
use super::messages::{
    CreatePipelineMessage,
    DeletePipelineMessage,
    // ListPipelinesMessage, RestartPipelineMessage,
    // StatusPipelineMessage, StopPipelineMessage, SystemAddReplicaMessage,
    // SystemRemoveReplicaMessage,
};
use super::system_supervisor::SystemActorSupervisor;
use domain::error::{IoTBeeError, PipelineLifecycleError};

// fn not_found(pipeline_id: u32) -> IoTBeeError {
//     PipelineLifecycleError::NotFound {
//         pipeline_id: pipeline_id.to_string(),
//     }
//     .into()
// }

// ── CreatePipeline ── asíncrono (ResponseActFuture) ───────────────────────────

impl Handler<CreatePipelineMessage> for SystemActorSupervisor {
    type Result = ResponseActFuture<Self, Result<(), IoTBeeError>>;

    fn handle(&mut self, msg: CreatePipelineMessage, _ctx: &mut Context<Self>) -> Self::Result {
        let pipeline_id = msg.pipeline_id;
        let pipeline_is_running = self.get_bridge(pipeline_id).is_some();

        Box::pin(
            async move {
                if pipeline_is_running {
                    return Err(PipelineLifecycleError::AlreadyRunning {
                        pipeline_id: pipeline_id.to_string(),
                    }
                    .into());
                }

                let pipeline_bridge = SupervisorPipelineBridge::start_new_pipeline_supervisor(
                    pipeline_id,
                    msg.pipeline_config,
                    msg.data_store,
                    msg.data_source,
                    msg.data_processor,
                );

                pipeline_bridge.start_pipeline().await?;
                Ok(pipeline_bridge)
            }
            .into_actor(self)
            .map(
                move |result: Result<SupervisorPipelineBridge, IoTBeeError>, actor, _ctx| {
                    let bridge = result?;
                    actor.insert_pipeline(pipeline_id, bridge);
                    Ok(())
                },
            ),
        )
    }
}

// // ── DeletePipeline ── síncrono ────────────────────────────────────────────────
impl Handler<DeletePipelineMessage> for SystemActorSupervisor {
    type Result = ResponseActFuture<Self, Result<(), IoTBeeError>>;

    fn handle(&mut self, msg: DeletePipelineMessage, _ctx: &mut Context<Self>) -> Self::Result {
        let pipeline_id = msg.pipeline_id;

        let bridge = match self.get_bridge(pipeline_id) {
            Some(b) => b,
            None => {
                return Box::pin(
                    async move {
                        Err(PipelineLifecycleError::NotFound {
                            pipeline_id: pipeline_id.to_string(),
                        }
                        .into())
                    }
                    .into_actor(self)
                    .map(move |result, _actor, _ctx| result),
                );
            }
        };

        Box::pin(
            async move { bridge.stop_pipeline().await }
                .into_actor(self)
                .map(move |result, actor, _ctx| {
                    result?;
                    actor._remove_pipeline(pipeline_id);
                    Ok(())
                }),
        )
    }
}

// // ── ListPipelines ── síncrono ─────────────────────────────────────────────────

// impl Handler<ListPipelinesMessage> for SystemActorSupervisor {
//     type Result = Vec<u32>;

//     fn handle(&mut self, _msg: ListPipelinesMessage, _ctx: &mut Context<Self>) -> Self::Result {
//         self.list_pipeline_ids()
//     }
// }

// // ── SystemAddReplica ── asíncrono ─────────────────────────────────────────────
// //
// // Patrón: clona el bridge en la parte síncrona (libera el borrow de &self),
// // luego delega en el bridge en Box::pin(async move {}).

// impl Handler<SystemAddReplicaMessage> for SystemActorSupervisor {
//     type Result = ResponseFuture<Result<usize, IoTBeeError>>;

//     fn handle(&mut self, msg: SystemAddReplicaMessage, _ctx: &mut Context<Self>) -> Self::Result {
//         let bridge = match self.get_bridge(msg.pipeline_id) {
//             Some(b) => b,
//             None => return Box::pin(async move { Err(not_found(msg.pipeline_id)) }),
//         };
//         Box::pin(async move { bridge.add_replica(msg.controller).await })
//     }
// }

// // ── SystemRemoveReplica ── asíncrono ──────────────────────────────────────────

// impl Handler<SystemRemoveReplicaMessage> for SystemActorSupervisor {
//     type Result = ResponseFuture<Result<(), IoTBeeError>>;

//     fn handle(
//         &mut self,
//         msg: SystemRemoveReplicaMessage,
//         _ctx: &mut Context<Self>,
//     ) -> Self::Result {
//         let bridge = match self.get_bridge(msg.pipeline_id) {
//             Some(b) => b,
//             None => return Box::pin(async move { Err(not_found(msg.pipeline_id)) }),
//         };
//         Box::pin(async move { bridge.remove_replica().await })
//     }
// }

// // ── StopPipeline ── asíncrono ─────────────────────────────────────────────────

// impl Handler<StopPipelineMessage> for SystemActorSupervisor {
//     type Result = ResponseFuture<Result<AllReplicasResult, IoTBeeError>>;

//     fn handle(&mut self, msg: StopPipelineMessage, _ctx: &mut Context<Self>) -> Self::Result {
//         let bridge = match self.get_bridge(msg.pipeline_id) {
//             Some(b) => b,
//             None => return Box::pin(async move { Err(not_found(msg.pipeline_id)) }),
//         };
//         Box::pin(async move { bridge.stop_all().await })
//     }
// }

// // ── RestartPipeline ── asíncrono ──────────────────────────────────────────────

// impl Handler<RestartPipelineMessage> for SystemActorSupervisor {
//     type Result = ResponseFuture<Result<AllReplicasResult, IoTBeeError>>;

//     fn handle(&mut self, msg: RestartPipelineMessage, _ctx: &mut Context<Self>) -> Self::Result {
//         let bridge = match self.get_bridge(msg.pipeline_id) {
//             Some(b) => b,
//             None => return Box::pin(async move { Err(not_found(msg.pipeline_id)) }),
//         };
//         Box::pin(async move { bridge.restart_all().await })
//     }
// }

// // ── StatusPipeline ── asíncrono ───────────────────────────────────────────────

// impl Handler<StatusPipelineMessage> for SystemActorSupervisor {
//     type Result = ResponseFuture<Result<AllReplicasResult, IoTBeeError>>;

//     fn handle(&mut self, msg: StatusPipelineMessage, _ctx: &mut Context<Self>) -> Self::Result {
//         let bridge = match self.get_bridge(msg.pipeline_id) {
//             Some(b) => b,
//             None => return Box::pin(async move { Err(not_found(msg.pipeline_id)) }),
//         };
//         Box::pin(async move { bridge.status_all().await })
//     }
// }
