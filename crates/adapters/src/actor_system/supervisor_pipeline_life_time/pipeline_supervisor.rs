use actix::prelude::*;
use logging::AppLogger;
use std::collections::HashMap;
use std::sync::Arc;

use super::pipeline_abstraction::PipelineAbstractionController;

use super::{DataExternalStoreThreadSafe, DataProcessorThreadSafe, DataSourceThreadSafe};
use domain::entities::pipeline_data::PipelineConfiguration;

static LOGGER: AppLogger = AppLogger::new(
    "iot_bee::adapters::actor_system::supervisor_pipeline_life_time::PipelineSupervisor",
);
// ── PipelineSupervisor ────────────────────────────────────────────────────────
//
// Actor que gestiona las réplicas de UN pipeline concreto.
// Cada réplica es un PipelineAbstractionController (consumer + processor + store)
// identificada por un u32 interno autoincrementable.
//
// El campo pipeline_id identifica de qué pipeline es supervisor.
// La lógica de routing entre pipelines vive en SystemActorSupervisor (nivel superior).
//
// El mapa `replicas` vive directamente como campo del actor: el mailbox de Actix
// garantiza acceso exclusivo a &mut self en la parte síncrona de cada handler,
// por lo que no se necesita ningún lock externo.
//
// Handlers síncronos (add, count): acceden a self.replicas directamente.
// Handlers asíncronos (start, stop, remove):
//   - Extraen los datos necesarios (drain / remove) en la parte síncrona.
//   - Hacen el trabajo async en Box::pin.
//   - Si necesitan escribir de vuelta al actor, envían un mensaje interno
//     a ctx.address() (InternalInsertReplicas / InternalReInsertReplicas).

pub struct PipelineSupervisor {
    pipeline_id: u32,
    pub(super) replicas: HashMap<u32, Arc<PipelineAbstractionController>>,
    pub(super) next_replica_id: u32,
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
            replicas: HashMap::new(),
            next_replica_id: 1,
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
