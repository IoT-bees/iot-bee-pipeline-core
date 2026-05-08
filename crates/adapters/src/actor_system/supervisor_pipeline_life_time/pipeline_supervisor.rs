use super::pipeline_abstraction::ReplicaRegistry;

use actix::prelude::*;
use logging::AppLogger;
use std::sync::Arc;

use super::{DataExternalStoreThreadSafe, DataProcessorThreadSafe, DataSourceThreadSafe};
use domain::entities::pipeline_data::PipelineConfiguration;

static LOGGER: AppLogger = AppLogger::new(
    "iot_bee::adapters::actor_system::supervisor_pipeline_life_time::PipelineSupervisor",
);
// ── PipelineSupervisor ────────────────────────────────────────────────────────
//
// Actor que gestiona las réplicas de UN pipeline concreto.
// Cada réplica es un PipelineAbstractionController (consumer + processor + store).
//
// El campo pipeline_id identifica de qué pipeline es supervisor.
// La lógica de routing entre pipelines vive en SystemActorSupervisor (nivel superior).
//
// Handlers síncronos (add, remove, count):
//   type Result = Result<_, IoTBeeError>  → el mailbox continúa
//
// Handlers asíncronos (stop_all, restart_all, status_all):
//   type Result = ResponseFuture<_>       → lanza Box::pin sin bloquear el mailbox.
//   Los Arc de las réplicas se clonan en la parte síncrona (all_arcs()) antes del
//   await, garantizando que el RwLockGuard se libere antes de cualquier suspensión.

pub struct PipelineSupervisor {
    pipeline_id: u32,
    replica_registry: Arc<ReplicaRegistry>,
    pipeline_configuration: PipelineConfiguration,
    data_source: DataSourceThreadSafe,
    data_processor: DataProcessorThreadSafe,
    data_store: DataExternalStoreThreadSafe,
}

impl PipelineSupervisor {
    pub fn new(
        pipeline_id: u32,
        pipeline_configuration: PipelineConfiguration,
        data_source: DataSourceThreadSafe,
        data_processor: DataProcessorThreadSafe,
        data_store: DataExternalStoreThreadSafe,
    ) -> Self {
        Self {
            pipeline_id,
            replica_registry: Arc::new(ReplicaRegistry::new()),
            pipeline_configuration,
            data_source,
            data_processor,
            data_store,
        }
    }
    pub fn pipeline_id(&self) -> u32 {
        self.pipeline_id
    }
    pub fn pipeline_configuration(&self) -> &PipelineConfiguration {
        &self.pipeline_configuration
    }
    pub fn replica_registry(&self) -> Arc<ReplicaRegistry> {
        Arc::clone(&self.replica_registry)
    }

    pub fn data_source(&self) -> DataSourceThreadSafe {
        Arc::clone(&self.data_source)
    }

    pub fn data_processor(&self) -> DataProcessorThreadSafe {
        Arc::clone(&self.data_processor)
    }

    pub fn data_store(&self) -> DataExternalStoreThreadSafe {
        Arc::clone(&self.data_store)
    }
}

impl Actor for PipelineSupervisor {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {
        LOGGER.info(&format!(
            "PipelineSupervisor started for pipeline_id={}.",
            self.pipeline_id
        ));
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        LOGGER.info(&format!(
            "PipelineSupervisor stopped for pipeline_id={}.",
            self.pipeline_id
        ));
    }
}
