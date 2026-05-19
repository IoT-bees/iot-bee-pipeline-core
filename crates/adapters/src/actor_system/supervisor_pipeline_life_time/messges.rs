use actix::prelude::*;
use std::sync::Arc;

use super::pipeline_abstraction::PipelineAbstractionController;
use domain::error::IoTBeeError;
use domain::value_objects::lifecycle_values::PipelineStatusReport;
// StartPipeline
// Inicia una única réplica del pipeline.
pub struct StartPipelineMessage;
impl Message for StartPipelineMessage {
    type Result = Result<(), IoTBeeError>;
}

// StartAllPipelines
// Inicia todas las réplicas del pipeline según el factor de replicación configurado.
// Internamente envía StartPipelineMessage por cada réplica.
pub struct StartAllPipelinesMessage;
impl Message for StartAllPipelinesMessage {
    type Result = Result<(), IoTBeeError>;
}
// ── ReplicaCount ──────────────────────────────────────────────────────────────
// Devuelve el número de réplicas activas.

pub struct ReplicaCountMessage;

impl Message for ReplicaCountMessage {
    type Result = Result<usize, IoTBeeError>;
}

// ── StopPipeline ─────────────────────────────────────────────────────────────
// Detiene una única réplica del pipeline identificada por su id.
pub struct StopPipelineMessage(pub u32);
impl Message for StopPipelineMessage {
    type Result = Result<(), IoTBeeError>;
}

// ── StopAllReplicas ───────────────────────────────────────────────────────────
// Detiene todos los actores de todas las réplicas activas.
// Internamente envía StopPipelineMessage por cada réplica.

pub struct StopAllReplicasMessage;

impl Message for StopAllReplicasMessage {
    type Result = Result<(), IoTBeeError>;
}

// ── RestartAllReplicas ────────────────────────────────────────────────────────
// Envía restart a todos los actores de todas las réplicas activas.

pub struct RestartAllReplicasMessage;

impl Message for RestartAllReplicasMessage {
    type Result = Result<(), IoTBeeError>;
}

// ── StatusReplica ───────────────────────────────────────────────────────────
// Consulta el estado de un actor específico dentro de una réplica.
pub struct StatusReplicasMessage(u32);
impl StatusReplicasMessage {
    pub fn new(replica_id: u32) -> Self {
        Self(replica_id)
    }
    pub fn replica_id(&self) -> u32 {
        self.0
    }
}
impl Message for StatusReplicasMessage {
    type Result = Result<(), IoTBeeError>;
}

// ── StatusAllReplicas ─────────────────────────────────────────────────────────
// Consulta el estado de todos los actores de todas las réplicas activas.
pub struct StatusAllReplicasMessage;
pub type StatusAllReplicasMessageResult = Result<PipelineStatusReport, IoTBeeError>;
impl Message for StatusAllReplicasMessage {
    type Result = StatusAllReplicasMessageResult;
}

// ── InternalInsertReplicas ────────────────────────────────────────────────────
// Mensaje interno enviado por StartPipeline a sí mismo tras crear los controllers
// en el bloque async. Permite insertar en self.replicas de forma síncrona,
// sin ningún lock externo.

pub struct InternalInsertReplicasMessage(pub Vec<PipelineAbstractionController>);

impl Message for InternalInsertReplicasMessage {
    type Result = Result<(), IoTBeeError>;
}

// ── InternalReInsertReplicas ──────────────────────────────────────────────────
// Mensaje interno usado por StopAll y RemoveReplica para devolver al actor las
// réplicas que no pudieron detenerse, conservando sus ids originales.

pub struct InternalReInsertReplicasMessage(pub Vec<(u32, Arc<PipelineAbstractionController>)>);

impl Message for InternalReInsertReplicasMessage {
    type Result = ();
}

// ── UpdateReplicationFactorMessage ───────────────────────────────────────────
// Actualiza el factor de replicación del pipeline, creando o eliminando réplicas
// según sea necesario. Se encarga de mantener el número correcto de réplicas activas
// y de manejar los casos en que no se puedan crear o eliminar réplicas, devolviendo un error en esos casos.
pub struct UpdateReplicationFactorMessage {
    replication_factor: u32,
}
impl UpdateReplicationFactorMessage {
    pub fn new(replication_factor: u32) -> Self {
        Self { replication_factor }
    }
    pub fn replication_factor(&self) -> u32 {
        self.replication_factor
    }
}

impl Message for UpdateReplicationFactorMessage {
    type Result = Result<(), IoTBeeError>;
}