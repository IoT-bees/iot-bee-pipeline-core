use actix::prelude::*;

// ---------------------------------------------------------------------------
// Estado interno del actor
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq)]
pub enum ConsumerActorState {
    /// El actor fue creado pero aún no ha iniciado el consumo.
    Idle,
    /// El actor está consumiendo mensajes activamente.
    Consuming,
    /// El actor está esperando antes de reconectarse (backoff).
    Reconnecting,
    /// El actor recibió una señal de parada y está cerrando recursos.
    Stopping,
    /// El actor terminó y no volverá a consumir.
    Stopped,
}

// ---------------------------------------------------------------------------
// Pool de acciones (mensajes entrantes al actor)
// ---------------------------------------------------------------------------

#[derive(Debug)]
pub enum ConsumerActorAction {
    /// Iniciar el consumo desde el DataSource.
    StartConsuming,
    /// Detener el consumo limpiamente (graceful shutdown).
    StopConsuming,
    /// Consultar el estado actual del actor.
    GetState,
    /// El actor cerro el canal de consumo inesperadamente (ej: error de conexión) y está detenido.
    ChannelDied,
}

pub struct ConsumerActorActionMessage(ConsumerActorAction);

impl ConsumerActorActionMessage {
    pub fn start_consuming() -> Self {
        ConsumerActorActionMessage(ConsumerActorAction::StartConsuming)
    }
    pub fn stop_consuming() -> Self {
        ConsumerActorActionMessage(ConsumerActorAction::StopConsuming)
    }
    pub fn channel_died() -> Self {
        ConsumerActorActionMessage(ConsumerActorAction::ChannelDied)
    }
    pub fn get_state() -> Self {
        ConsumerActorActionMessage(ConsumerActorAction::GetState)
    }
    pub fn action(&self) -> &ConsumerActorAction {
        &self.0
    }
}

impl Message for ConsumerActorActionMessage {
    type Result = ConsumerActorState;
}
