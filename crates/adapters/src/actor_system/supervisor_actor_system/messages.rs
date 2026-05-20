use actix::prelude::*;

use super::super::supervisor_pipeline_life_time::pipeline_abstraction::PipelineAbstractionController;
use domain::error::IoTBeeError;

// ── CreatePipeline ────────────────────────────────────────────────────────────
// Crea un nuevo PipelineSupervisor para el pipeline dado.
// Error si ya existe un supervisor para ese pipeline_id.
use domain::entities::pipeline_data::PipelineConfiguration;
use domain::outbound::{
    data_external_store::DataExternalStore, data_processor_actions::DataProcessorActions,
    data_source::DataSource,
};
use std::sync::Arc;

pub struct CreatePipelineMessage {
    pub pipeline_id: u32,
    pub pipeline_config: PipelineConfiguration,
    pub data_source: Arc<dyn DataSource + Send + Sync>,
    pub data_processor: Arc<dyn DataProcessorActions + Send + Sync>,
    pub data_store: Arc<dyn DataExternalStore + Send + Sync>,
}

impl CreatePipelineMessage {
    pub fn new(
        pipeline_id: u32,
        pipeline_config: PipelineConfiguration,
        data_source: Arc<dyn DataSource + Send + Sync>,
        data_processor: Arc<dyn DataProcessorActions + Send + Sync>,
        data_store: Arc<dyn DataExternalStore + Send + Sync>,
    ) -> Self {
        Self {
            pipeline_id,
            pipeline_config,
            data_source,
            data_processor,
            data_store,
        }
    }
}

impl Message for CreatePipelineMessage {
    type Result = Result<(), IoTBeeError>;
}

// ── DeletePipeline ────────────────────────────────────────────────────────────
// Elimina el PipelineSupervisor completo para el pipeline dado.
// Error si no existe.

pub struct DeletePipelineMessage {
    pub pipeline_id: u32,
}

impl DeletePipelineMessage {
    pub fn new(pipeline_id: u32) -> Self {
        Self { pipeline_id }
    }
}

impl Message for DeletePipelineMessage {
    type Result = Result<(), IoTBeeError>;
}

// ── ListPipelines ─────────────────────────────────────────────────────────────
// Devuelve los pipeline_ids de todos los supervisores registrados.

pub struct ListPipelinesMessage;

impl Message for ListPipelinesMessage {
    type Result = Vec<u32>;
}

// ── SystemAddReplica ──────────────────────────────────────────────────────────
// Añade una réplica al PipelineSupervisor de un pipeline existente.
// Devuelve el número total de réplicas tras la inserción.

pub struct SystemAddReplicaMessage {
    pub pipeline_id: u32,
    pub controller: PipelineAbstractionController,
}

impl SystemAddReplicaMessage {
    pub fn new(pipeline_id: u32, controller: PipelineAbstractionController) -> Self {
        Self {
            pipeline_id,
            controller,
        }
    }
}

impl Message for SystemAddReplicaMessage {
    type Result = Result<usize, IoTBeeError>;
}

// ── SystemRemoveReplica ───────────────────────────────────────────────────────
// Elimina la última réplica del PipelineSupervisor de un pipeline existente.

pub struct SystemRemoveReplicaMessage {
    pub pipeline_id: u32,
}

impl SystemRemoveReplicaMessage {
    pub fn new(pipeline_id: u32) -> Self {
        Self { pipeline_id }
    }
}

impl Message for SystemRemoveReplicaMessage {
    type Result = Result<(), IoTBeeError>;
}

// ── StopPipeline ──────────────────────────────────────────────────────────────
// Envía stop a todas las réplicas del pipeline dado.

pub struct StopPipelineMessage {
    pub pipeline_id: u32,
}

impl StopPipelineMessage {
    pub fn new(pipeline_id: u32) -> Self {
        Self { pipeline_id }
    }
}

impl Message for StopPipelineMessage {
    type Result = Result<(), IoTBeeError>;
}

// ── RestartPipeline ───────────────────────────────────────────────────────────
// Envía restart a todas las réplicas del pipeline dado.

pub struct RestartPipelineMessage {
    pub pipeline_id: u32,
}

impl RestartPipelineMessage {
    pub fn new(pipeline_id: u32) -> Self {
        Self { pipeline_id }
    }
}

impl Message for RestartPipelineMessage {
    type Result = Result<(), IoTBeeError>;
}

// ── StatusPipeline ────────────────────────────────────────────────────────────
// Consulta el estado de todas las réplicas del pipeline dado.

pub struct StatusPipelineMessage(u32);

impl StatusPipelineMessage {
    pub fn new(pipeline_id: u32) -> Self {
        Self(pipeline_id)
    }
    pub fn pipeline_id(&self) -> u32 {
        self.0
    }
}
use domain::value_objects::lifecycle_values::PipelineStatusReport;
impl Message for StatusPipelineMessage {
    type Result = Result<PipelineStatusReport, IoTBeeError>;
}

pub struct StatusPipelineMessageAll;
impl StatusPipelineMessageAll {
    pub fn new() -> Self {
        Self
    }
}
impl Message for StatusPipelineMessageAll {
    type Result = Result<Vec<PipelineStatusReport>, IoTBeeError>;
}

// StartAllPipelinesInLocalStorageMessage

pub struct StartAllPipelinesInLocalStorageMessage;
impl Message for StartAllPipelinesInLocalStorageMessage {
    type Result = Result<(), IoTBeeError>;
}

pub struct UpdateReplicationFactorMessage {
    pub pipeline_id: u32,
    pub replication_factor: u32,
}

impl UpdateReplicationFactorMessage {
    pub fn new(pipeline_id: u32, replication_factor: u32) -> Self {
        Self {
            pipeline_id,
            replication_factor,
        }
    }
}

impl Message for UpdateReplicationFactorMessage {
    type Result = Result<(), IoTBeeError>;
}
