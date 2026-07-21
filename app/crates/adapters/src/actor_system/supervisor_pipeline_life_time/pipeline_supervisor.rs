use actix::prelude::*;
use logging::AppLogger;
use std::collections::HashMap;
use std::sync::Arc;

use super::pipeline_abstraction::PipelineAbstractionController;

use super::{DataExternalStoreThreadSafe, DataProcessorThreadSafe, DataSourceThreadSafe};
use domain::entities::pipeline_data::PipelineConfiguration;
use domain::usage::entities::UsageScope;
use domain::usage::outbound::UsageMeter;

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
    pipeline_configuration: PipelineConfiguration,
    data_source: DataSourceThreadSafe,
    data_processor: DataProcessorThreadSafe,
    data_store: DataExternalStoreThreadSafe,
    usage_scope: UsageScope,
    usage_meter: Arc<dyn UsageMeter>,
}

impl PipelineSupervisor {
    pub fn new(
        pipeline_id: u32,
        pipeline_configuration: PipelineConfiguration,
        data_source: DataSourceThreadSafe,
        data_processor: DataProcessorThreadSafe,
        data_store: DataExternalStoreThreadSafe,
        usage_scope: UsageScope,
        usage_meter: Arc<dyn UsageMeter>,
    ) -> Self {
        Self {
            pipeline_id,
            replicas: HashMap::new(),
            pipeline_configuration,
            data_source,
            data_processor,
            data_store,
            usage_scope,
            usage_meter,
        }
    }
    pub fn pipeline_id(&self) -> u32 {
        self.pipeline_id
    }
    pub fn pipeline_name(&self) -> &str {
        self.pipeline_configuration.pipeline_name()
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
    pub fn replica_count(&self) -> u32 {
        self.replicas.len() as u32
    }
    pub fn usage_scope(&self) -> UsageScope {
        self.usage_scope
    }
    pub fn usage_meter(&self) -> Arc<dyn UsageMeter> {
        Arc::clone(&self.usage_meter)
    }

    /// Devuelve el menor ID positivo que no esté en uso.
    /// Garantiza que al insertar réplicas después de eliminaciones se rellenen
    /// los huecos en orden, manteniendo la secuencia continua.
    pub(super) fn next_available_id(&self) -> u32 {
        let mut id: u32 = 1;
        while self.replicas.contains_key(&id) {
            id += 1;
        }
        id
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
