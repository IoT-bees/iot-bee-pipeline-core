use actix::prelude::*;
use std::sync::Arc;

use super::pipeline_abstraction::PipelineAbstractionController;
use domain::error::IoTBeeError;

// StartPipeline
// Inicia todos el pipeline
pub struct StartPipelineMessage;
impl Message for StartPipelineMessage {
    type Result = Result<(), IoTBeeError>;
}

// ── AddReplica ────────────────────────────────────────────────────────────────
// Añade una réplica al supervisor. Devuelve el número total de réplicas.

pub struct AddReplicaMessage {
    pub controller: PipelineAbstractionController,
}

impl AddReplicaMessage {
    pub fn new(controller: PipelineAbstractionController) -> Self {
        Self { controller }
    }
}

impl Message for AddReplicaMessage {
    type Result = Result<usize, IoTBeeError>;
}

// ── RemoveReplica ─────────────────────────────────────────────────────────────
// Elimina la réplica con el id indicado. Error si no existe.

pub struct RemoveReplicaMessage {
    replica_id: u32,
}

impl RemoveReplicaMessage {
    pub fn new(replica_id: u32) -> Self {
        Self { replica_id }
    }
    pub fn replica_id(&self) -> u32 {
        self.replica_id
    }
}

impl Message for RemoveReplicaMessage {
    type Result = Result<(), IoTBeeError>;
}

// ── ReplicaCount ──────────────────────────────────────────────────────────────
// Devuelve el número de réplicas activas.

pub struct ReplicaCountMessage;

impl Message for ReplicaCountMessage {
    type Result = Result<usize, IoTBeeError>;
}

// ── StopAllReplicas ───────────────────────────────────────────────────────────
// Envía stop a todos los actores de todas las réplicas activas.

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

impl Message for StatusAllReplicasMessage {
    type Result = Result<(), IoTBeeError>;
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
