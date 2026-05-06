// brigde wrapper para enviar mensajes a SystemActorSupervisor sin exponer su ActorAddr ni lógica de routing a handlers.rs
use domain::inbound::pipeline_lifecycle::PipelineLifecycle;
use domain::value_objects::pipelines_values::DataStoreId;
use async_trait::async_trait;

use super::messages::{
    CreatePipelineMessage,
    // DeletePipelineMessage, ListPipelinesMessage, SystemAddReplicaMessage,
    // SystemRemoveReplicaMessage,
};

use domain::error::{IoTBeeError, PipelineLifecycleError};
use actix::prelude::*;

use domain::entities::pipeline_data::PipelineConfiguration;
use domain::outbound::{
    data_external_store::DataExternalStore, data_processor_actions::DataProcessorActions,
    data_source::DataSource,
};
use std::sync::{Arc, OnceLock};

use super::system_supervisor::SystemActorSupervisor;

// El Addr<SystemActorSupervisor> es el verdadero singleton: un único actor supervisor
// vive durante todo el programa. OnceLock garantiza que Supervisor::start solo se llama
// una vez, sin importar cuántas veces se llame a `instance()`.
static SUPERVISOR_ADDR: OnceLock<Addr<SystemActorSupervisor>> = OnceLock::new();

pub struct PipelineActorSupervisorSystemBridge {
    supervisor_addr: Addr<SystemActorSupervisor>,
}

impl PipelineActorSupervisorSystemBridge {
    /// Devuelve un wrapper que apunta al único SystemActorSupervisor del proceso.
    /// El actor se crea la primera vez que se llama; las llamadas siguientes
    /// reutilizan el mismo Addr (clonado, sin crear un nuevo actor).
    pub fn instance() -> Self {
        let addr = SUPERVISOR_ADDR.get_or_init(|| {
            let system_supervisor = SystemActorSupervisor::new();
            Supervisor::start(move |_ctx| system_supervisor)
        });
        Self {
            supervisor_addr: addr.clone(),
        }
    }
}

//Esto espara poder llamar al tipo en los casos de uso
#[async_trait]
impl PipelineLifecycle for PipelineActorSupervisorSystemBridge {
    // Implementación de los métodos de PipelineLifecycle aquí

    // para iniciar el pipeline debo enviarle la inyeccion de las dependencias necesarias para el pipeline
    async fn start(
        &self,
        pipeline_id: &DataStoreId,
        pipeline_config: PipelineConfiguration,
        data_source: Arc<dyn DataSource + Send + Sync>,
        data_processor: Arc<dyn DataProcessorActions + Send + Sync>,
        data_store: Arc<dyn DataExternalStore + Send + Sync>,
    ) -> Result<(), IoTBeeError> {
        let message_to_send = CreatePipelineMessage::new(
            pipeline_id.id(),
            pipeline_config,
            data_source,
            data_processor,
            data_store,
        );

        self.supervisor_addr
            .send(message_to_send)
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
