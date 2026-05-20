use actix::prelude::*;
use chrono::{DateTime, Utc};
use domain::error::IoTBeeError;
use domain::value_objects::lifecycle_values::{ActorActions, ActorOperationStatus, ActorStatus};

pub struct ResponseActorActionMessage(ActorStatus);
impl ResponseActorActionMessage {
    pub fn new(status: ActorStatus) -> Self {
        Self(status)
    }
    pub fn status(&self) -> ActorStatus {
        self.0
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
    pub fn running() -> Self {
        Self(ActorStatus::Running)
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

// Statos internos de las operaciones del actor

pub struct GetActorOperationStatusMessage;

pub type GetActorOperationStatusMessageResult = Result<ActorOperationStatus, IoTBeeError>;
impl Message for GetActorOperationStatusMessage {
    type Result = GetActorOperationStatusMessageResult;
}

// Telemetría por actor: timestamp del último mensaje procesado y último error.

pub struct GetLastProcessedAtMessage;

pub type GetLastProcessedAtMessageResult = Result<Option<DateTime<Utc>>, IoTBeeError>;
impl Message for GetLastProcessedAtMessage {
    type Result = GetLastProcessedAtMessageResult;
}

pub struct GetLastErrorMessage;

pub type GetLastErrorMessageResult = Result<Option<String>, IoTBeeError>;
impl Message for GetLastErrorMessage {
    type Result = GetLastErrorMessageResult;
}
