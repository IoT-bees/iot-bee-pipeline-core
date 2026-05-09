
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActorActions {
    // Start, //Start no es valido ya que los actores son iniciados por el supervisor y no pueden ser iniciado por ellos mismos
    Stop,
    Restart,
    Status,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActorStatus {
    Running,
    Stopped,
    Restarting,
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActorOperationStatus {
    Idle,
    Healthy,
    Degraded,
}