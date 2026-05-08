use actix::prelude::*;
use domain::error::IoTBeeError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActorActions {
    // Start,
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

pub struct ResponseActorActionMessage(ActorStatus);
impl ResponseActorActionMessage {
    pub fn new(status: ActorStatus) -> Self {
        Self(status)
    }
    pub fn status(&self) -> ActorStatus {
        self.0
    }

    pub fn running() -> Self {
        Self(ActorStatus::Running)
    }
    pub fn stopped() -> Self {
        Self(ActorStatus::Stopped)
    }
    pub fn restarting() -> Self {
        Self(ActorStatus::Restarting)
    }
    pub fn failed() -> Self {
        Self(ActorStatus::Failed)
    }
}

pub struct SendActorActionMessage(ActorActions);
impl SendActorActionMessage {
    pub fn new(action: ActorActions) -> Self {
        Self(action)
    }
    pub fn action(&self) -> ActorActions {
        self.0
    }

    pub fn stop() -> Self {
        Self(ActorActions::Stop)
    }
    pub fn restart() -> Self {
        Self(ActorActions::Restart)
    }
    pub fn status() -> Self {
        Self(ActorActions::Status)
    }
}

pub type SendActorActionMessageResult = Result<ResponseActorActionMessage, IoTBeeError>;
impl Message for SendActorActionMessage {
    type Result = SendActorActionMessageResult;
}
