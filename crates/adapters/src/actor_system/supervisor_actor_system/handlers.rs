use actix::prelude::*;

// use super::super::supervisor_pipeline_life_time::pipeline_abstraction::AllReplicasResult;
use super::super::supervisor_pipeline_life_time::{
    actor_wrapper::SupervisorPipelineBridge,
    // pipeline_supervisor::PipelineSupervisor,
};
use super::messages::{
    CreatePipelineMessage,
    DeletePipelineMessage,
    StatusPipelineMessage,
    // ListPipelinesMessage, RestartPipelineMessage,
    // StatusPipelineMessage, StopPipelineMessage, SystemAddReplicaMessage,
    // SystemRemoveReplicaMessage,
};
use super::system_supervisor::SystemActorSupervisor;
use domain::error::{IoTBeeError, PipelineLifecycleError};
use domain::value_objects::pipelines_values::PipelineStatus;

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

impl Handler<StatusPipelineMessage> for SystemActorSupervisor {
    type Result = ResponseActFuture<Self, Result<PipelineStatus, IoTBeeError>>;

    fn handle(&mut self, msg: StatusPipelineMessage, _ctx: &mut Context<Self>) -> Self::Result {
        let pipeline_id = msg.pipeline_id();

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
            async move {
                bridge.status_all().await?;
                Ok(PipelineStatus::Running) // Esto es un placeholder, deberia retornar el status real del pipeline
            }
            .into_actor(self)
            .map(move |result: Result<PipelineStatus, IoTBeeError>, _actor, _ctx| result),
        )
    }
}
