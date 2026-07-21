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
    StatusPipelineMessageAll,
    UpdateReplicationFactorMessage,
    // ListPipelinesMessage, RestartPipelineMessage,
    // StatusPipelineMessage, StopPipelineMessage, SystemAddReplicaMessage,
    // SystemRemoveReplicaMessage,
};
use super::system_supervisor::SystemActorSupervisor;
use domain::error::{IoTBeeError, PipelineLifecycleError};
use domain::value_objects::lifecycle_values::PipelineStatusReport;
use logging::AppLogger;
static LOGGER: AppLogger =
    AppLogger::new("iot_bee::adapters::actor_system::supervisor_actor_system::handlers");
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
                    msg.usage_scope,
                    msg.usage_meter,
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
    type Result = ResponseActFuture<Self, Result<PipelineStatusReport, IoTBeeError>>;

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
                bridge
                    .status_all()
                    .await
                    .map(|r| r.with_pipeline_id(pipeline_id))
            }
            .into_actor(self)
            .map(move |result: Result<PipelineStatusReport, IoTBeeError>, _actor, _ctx| result),
        )
    }
}

impl Handler<StatusPipelineMessageAll> for SystemActorSupervisor {
    type Result = ResponseActFuture<Self, Result<Vec<PipelineStatusReport>, IoTBeeError>>;

    fn handle(&mut self, _msg: StatusPipelineMessageAll, _ctx: &mut Context<Self>) -> Self::Result {
        let pipelines_bridge = self.get_all_bridges();

        Box::pin(
            async move {
                let mut reports = Vec::new();
                for (pipeline_id, bridge) in pipelines_bridge {
                    let status = bridge.status_all().await;
                    match status {
                        Ok(s) => reports.push(s.with_pipeline_id(pipeline_id)),
                        Err(e) => {
                            LOGGER.error(&format!("Error obteniendo status de pipeline -> {e}"));
                            continue;
                        }
                    };
                }
                Ok(reports)
            }
            .into_actor(self)
            .map(
                move |result: Result<Vec<PipelineStatusReport>, IoTBeeError>, _actor, _ctx| result,
            ),
        )
    }
}

impl Handler<UpdateReplicationFactorMessage> for SystemActorSupervisor {
    type Result = ResponseActFuture<Self, Result<(), IoTBeeError>>;

    fn handle(
        &mut self,
        msg: UpdateReplicationFactorMessage,
        _ctx: &mut Context<Self>,
    ) -> Self::Result {
        let pipeline_id = msg.pipeline_id;
        let replication_factor = msg.replication_factor;

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
            async move { bridge.update_replication_factor(replication_factor).await }
                .into_actor(self)
                .map(move |result, _actor, _ctx| result),
        )
    }
}
