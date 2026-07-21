use chrono::{DateTime, Utc};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct UsageScope {
    pub organization_id: i64,
    pub pipeline_id: u32,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct UsageCounters {
    pub messages_received: u64,
    pub messages_validated: u64,
    pub messages_delivered: u64,
    pub messages_failed: u64,
    pub bytes_in: u64,
    pub bytes_out: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum UsageEvent {
    Received {
        bytes: u64,
    },
    Validated,
    Invalid,
    Delivered {
        bytes_out: u64,
    },
    Failed,
    /// El mensaje se descartó antes de reservar capacidad de procesamiento.
    QuotaBlocked,
}

#[derive(Clone, Debug)]
pub struct UsageView {
    pub organization_id: i64,
    pub pipeline_id: Option<u32>,
    pub cycle_start: DateTime<Utc>,
    pub cycle_end: DateTime<Utc>,
    pub included_messages: u64,
    pub counters: UsageCounters,
    pub quota_state: UsageQuotaState,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum UsageQuotaState {
    Available,
    Warning,
    Exhausted,
}
