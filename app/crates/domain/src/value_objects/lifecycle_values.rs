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

use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct FlowStageTelemetry {
    count: u64,
    last_activity_at: Option<DateTime<Utc>>,
}

impl FlowStageTelemetry {
    pub fn record(&mut self) {
        self.count += 1;
        self.last_activity_at = Some(Utc::now());
    }

    pub fn count(&self) -> u64 {
        self.count
    }

    pub fn last_activity_at(&self) -> Option<DateTime<Utc>> {
        self.last_activity_at
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ReplicaFlowTelemetry {
    received: FlowStageTelemetry,
    validated: FlowStageTelemetry,
    rejected: FlowStageTelemetry,
    delivered: FlowStageTelemetry,
}

impl ReplicaFlowTelemetry {
    pub fn record_received(&mut self) {
        self.received.record();
    }

    pub fn record_validated(&mut self) {
        self.validated.record();
    }

    pub fn record_rejected(&mut self) {
        self.rejected.record();
    }

    pub fn record_delivered(&mut self) {
        self.delivered.record();
    }

    pub fn received(&self) -> &FlowStageTelemetry {
        &self.received
    }

    pub fn validated(&self) -> &FlowStageTelemetry {
        &self.validated
    }

    pub fn rejected(&self) -> &FlowStageTelemetry {
        &self.rejected
    }

    pub fn delivered(&self) -> &FlowStageTelemetry {
        &self.delivered
    }

    pub fn merge(consumer: Self, processor: Self, store: Self) -> Self {
        Self {
            received: consumer.received,
            validated: processor.validated,
            rejected: processor.rejected,
            delivered: store.delivered,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PipelinepartsStatus {
    processor: ActorOperationStatus,
    consumer: ActorOperationStatus,
    store: ActorOperationStatus,
    last_processed_at: Option<DateTime<Utc>>,
    last_error: Option<String>,
    flow_telemetry: ReplicaFlowTelemetry,
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
            last_processed_at: None,
            last_error: None,
            flow_telemetry: ReplicaFlowTelemetry::default(),
        }
    }

    pub fn with_telemetry(
        mut self,
        last_processed_at: Option<DateTime<Utc>>,
        last_error: Option<String>,
    ) -> Self {
        self.last_processed_at = last_processed_at;
        self.last_error = last_error;
        self
    }

    pub fn last_processed_at(&self) -> Option<DateTime<Utc>> {
        self.last_processed_at
    }

    pub fn last_error(&self) -> Option<&str> {
        self.last_error.as_deref()
    }

    pub fn with_flow_telemetry(mut self, flow_telemetry: ReplicaFlowTelemetry) -> Self {
        self.flow_telemetry = flow_telemetry;
        self
    }

    pub fn flow_telemetry(&self) -> &ReplicaFlowTelemetry {
        &self.flow_telemetry
    }

    pub fn overall_status(&self) -> PipelineStatus {
        let statuses = [self.processor, self.consumer, self.store];

        // Si alguno está Degraded, el estado general es Degraded.
        if statuses
            .iter()
            .any(|s| *s == ActorOperationStatus::Degraded)
        {
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

        let replica_statuses: Vec<PipelineStatus> = self
            .pipelines
            .values()
            .map(|p| p.overall_status())
            .collect();

        // Si alguna réplica está Degraded, el estado general es Degraded.
        if replica_statuses
            .iter()
            .any(|s| *s == PipelineStatus::Degraded)
        {
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

    pub fn replicas(&self) -> &HashMap<u32, PipelinepartsStatus> {
        &self.pipelines
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
