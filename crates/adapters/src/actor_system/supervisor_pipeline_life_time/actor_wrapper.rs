use actix::prelude::*;

use super::messges::{
    AddReplicaMessage, RemoveReplicaMessage, ReplicaCountMessage, RestartAllReplicasMessage,
    StartPipelineMessage, StatusAllReplicasMessage, StatusAllReplicasMessageResult,
    StopAllReplicasMessage,
};
use super::pipeline_abstraction::PipelineAbstractionController;
use super::pipeline_supervisor::PipelineSupervisor;
use domain::error::{IoTBeeError, PipelineLifecycleError};

use super::{DataExternalStoreThreadSafe, DataProcessorThreadSafe, DataSourceThreadSafe};
use domain::entities::pipeline_data::PipelineConfiguration;
// ── SupervisorPipelineBridge ──────────────────────────────────────────────────
//
// Wrapper cloneable de Addr<PipelineSupervisor>. Expone la API del supervisor
// como métodos async tipados sin exponer el tipo Actor al exterior.
// Addr<A> implementa Clone, por lo que el derive es suficiente.
#[derive(Clone)]
pub struct SupervisorPipelineBridge {
    addr: Addr<PipelineSupervisor>,
}

impl SupervisorPipelineBridge {
    pub fn start_new_pipeline_supervisor(
        pipeline_id: u32,
        pipeline_configuration: PipelineConfiguration,
        data_store: DataExternalStoreThreadSafe,
        data_source: DataSourceThreadSafe,
        data_processor: DataProcessorThreadSafe,
    ) -> Self {
        let pipeline_supervisor = PipelineSupervisor::new(
            pipeline_id,
            pipeline_configuration,
            data_source,
            data_processor,
            data_store,
        );
        let addr = pipeline_supervisor.start();
        Self { addr }
    }

    pub async fn start_pipeline(&self) -> Result<(), IoTBeeError> {
        self.addr
            .send(StartPipelineMessage)
            .await
            .map_err(mailbox_err)?
    }

    pub async fn stop_pipeline(&self) -> Result<(), IoTBeeError> {
        self.addr
            .send(StopAllReplicasMessage)
            .await
            .map_err(mailbox_err)?
    }

    pub async fn add_replica(
        &self,
        controller: PipelineAbstractionController,
    ) -> Result<usize, IoTBeeError> {
        self.addr
            .send(AddReplicaMessage::new(controller))
            .await
            .map_err(mailbox_err)?
    }

    pub async fn remove_replica(&self, replica_id: u32) -> Result<(), IoTBeeError> {
        self.addr
            .send(RemoveReplicaMessage::new(replica_id))
            .await
            .map_err(mailbox_err)?
    }

    pub async fn replica_count(&self) -> Result<usize, IoTBeeError> {
        self.addr
            .send(ReplicaCountMessage)
            .await
            .map_err(mailbox_err)?
    }

    pub async fn restart_all(&self) -> Result<(), IoTBeeError> {
        self.addr
            .send(RestartAllReplicasMessage)
            .await
            .map_err(mailbox_err)?
    }

    pub async fn status_all(&self) -> StatusAllReplicasMessageResult {
        self.addr
            .send(StatusAllReplicasMessage)
            .await
            .map_err(mailbox_err)?
    }
}

fn mailbox_err(e: MailboxError) -> IoTBeeError {
    PipelineLifecycleError::InternalCommunication {
        reason: format!("Fallo de comunicación con PipelineSupervisor: {}", e),
    }
    .into()
}
