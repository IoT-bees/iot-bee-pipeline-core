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
        let statuses = [self.processor, self.consumer, self.store];

        // Si alguno está Degraded, el estado general es Degraded.
        if statuses.iter().any(|s| *s == ActorOperationStatus::Degraded) {
            return PipelineStatus::Degraded;
        }
        // Si todos están Idle, el estado general es Idle.
        if statuses.iter().all(|s| *s == ActorOperationStatus::Idle) {
            return PipelineStatus::Idle;
        }
        // Cualquier combinación de Healthy + Idle (sin Degraded) es Healthy.
        PipelineStatus::Healthy
    }
}

//crear aca un structu que me defina todo el pipeline donde cada pipelinepartStatus es un Pipeline y este structu define un conjuntonde pipelines
use std::collections::HashMap;
pub struct PipelineStatusReport {
    pipeline_id: u32,
    pipeline_name: String,
    pipelines: HashMap<u32, PipelinepartsStatus>,
}
impl PipelineStatusReport {
    pub fn new(pipelines: HashMap<u32, PipelinepartsStatus>) -> Self {
        Self {
            pipeline_id: 0,
            pipeline_name: String::new(),
            pipelines,
        }
    }

    pub fn with_metadata(mut self, pipeline_id: u32, pipeline_name: impl Into<String>) -> Self {
        self.pipeline_id = pipeline_id;
        self.pipeline_name = pipeline_name.into();
        self
    }

    pub fn with_pipeline_id(mut self, pipeline_id: u32) -> Self {
        self.pipeline_id = pipeline_id;
        self
    }

    pub fn pipeline_id(&self) -> u32 {
        self.pipeline_id
    }

    pub fn pipeline_name(&self) -> &str {
        &self.pipeline_name
    }
    pub fn overall_status(&self) -> PipelineStatus {
        if self.pipelines.is_empty() {
            return PipelineStatus::Idle;
        }

        let replica_statuses: Vec<PipelineStatus> =
            self.pipelines.values().map(|p| p.overall_status()).collect();

        // Si alguna réplica está Degraded, el estado general es Degraded.
        if replica_statuses.iter().any(|s| *s == PipelineStatus::Degraded) {
            return PipelineStatus::Degraded;
        }
        // Si todas las réplicas están Idle, el estado general es Idle.
        if replica_statuses.iter().all(|s| *s == PipelineStatus::Idle) {
            return PipelineStatus::Idle;
        }
        // Cualquier combinación de Healthy + Idle (sin Degraded) es Healthy.
        PipelineStatus::Healthy
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
