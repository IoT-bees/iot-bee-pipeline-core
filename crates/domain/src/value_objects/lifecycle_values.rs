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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PipelineStatus {
    Healthy,
    Idle,
    // Failed,
    Degraded,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PipelinepartsStatus {
    processor: ActorOperationStatus,
    consumer: ActorOperationStatus,
    store: ActorOperationStatus,
}

impl PipelinepartsStatus {
    pub fn new(
        processor: ActorOperationStatus,
        consumer: ActorOperationStatus,
        store: ActorOperationStatus,
    ) -> Self {
        Self {
            processor,
            consumer,
            store,
        }
    }
    pub fn overall_status(&self) -> PipelineStatus {
        match (self.processor, self.consumer, self.store) {
            (
                ActorOperationStatus::Healthy,
                ActorOperationStatus::Healthy,
                ActorOperationStatus::Healthy,
            ) => PipelineStatus::Healthy,
            (ActorOperationStatus::Idle, _, _)
            | (_, ActorOperationStatus::Idle, _)
            | (_, _, ActorOperationStatus::Idle) => PipelineStatus::Idle,
            // (ActorOperationStatus::Failed, _, _) | (_, ActorOperationStatus::Failed, _) | (_, _, ActorOperationStatus::Failed) => PipelineStatus::Failed,
            _ => PipelineStatus::Degraded,
        }
    }
}

//crear aca un structu que me defina todo el pipeline donde cada pipelinepartStatus es un Pipeline y este structu define un conjuntonde pipelines
use std::collections::HashMap;
pub struct PipelineStatusReport {
    pipelines: HashMap<u32, PipelinepartsStatus>,
}
impl PipelineStatusReport {
    pub fn new(pipelines: HashMap<u32, PipelinepartsStatus>) -> Self {
        Self { pipelines }
    }
    pub fn overall_status(&self) -> PipelineStatus {
        if self
            .pipelines
            .values()
            .all(|p| p.overall_status() == PipelineStatus::Healthy)
        {
            PipelineStatus::Healthy
        } else if self
            .pipelines
            .values()
            .any(|p| p.overall_status() == PipelineStatus::Idle)
        {
            PipelineStatus::Idle
        } else if self
            .pipelines
            .values()
            .any(|p| p.overall_status() == PipelineStatus::Degraded)
        {
            PipelineStatus::Degraded
        } else {
            PipelineStatus::Degraded // Si no hay pipelines, consideramos el estado general como degradado (o podríamos definir otro estado para esto)
        }
    }

    pub fn overall_string_status(&self) -> String {
        match self.overall_status() {
            PipelineStatus::Healthy => "Healthy".to_string(),
            PipelineStatus::Idle => "Idle".to_string(),
            // PipelineStatus::Failed => "Failed".to_string(),
            PipelineStatus::Degraded => "Degraded".to_string(),
        }
    }

    pub fn pipeline_health_by_reply(&self) -> HashMap<u32, PipelineStatus> {
        self.pipelines
            .iter()
            .map(|(id, status)| (*id, status.overall_status()))
            .collect()
    }
    pub fn pipeline_health_by_reply_string(&self) -> HashMap<u32, String> {
        self.pipelines
            .iter()
            .map(|(id, status)| {
                let status_str = match status.overall_status() {
                    PipelineStatus::Healthy => "Healthy",
                    PipelineStatus::Idle => "Idle",
                    // PipelineStatus::Failed => "Failed",
                    PipelineStatus::Degraded => "Degraded",
                }
                .to_string();
                (*id, status_str)
            })
            .collect()
    }
}
