use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::error::IoTBeeError;

use super::entities::{UsageCounters, UsageEvent, UsageScope};

#[async_trait]
pub trait UsageRepository: Send + Sync {
    async fn reserve_processing_slot(
        &self,
        organization_id: i64,
        at: DateTime<Utc>,
        included_messages: u64,
    ) -> Result<bool, IoTBeeError>;
    async fn release_processing_slot(
        &self,
        organization_id: i64,
        at: DateTime<Utc>,
    ) -> Result<(), IoTBeeError>;
    async fn record(
        &self,
        scope: UsageScope,
        at: DateTime<Utc>,
        event: UsageEvent,
    ) -> Result<(), IoTBeeError>;
    async fn current_month(
        &self,
        organization_id: i64,
        at: DateTime<Utc>,
    ) -> Result<UsageCounters, IoTBeeError>;
    async fn current_month_by_pipeline(
        &self,
        organization_id: i64,
        at: DateTime<Utc>,
    ) -> Result<Vec<(u32, UsageCounters)>, IoTBeeError>;
    async fn claim_notification(
        &self,
        organization_id: i64,
        cycle_start: DateTime<Utc>,
        threshold: u8,
    ) -> Result<bool, IoTBeeError>;
}

/// Puerto de tiempo de ejecución usado por los actores. La política comercial
/// se implementa en application; los actores no conocen planes ni Stripe.
#[async_trait]
pub trait UsageMeter: Send + Sync {
    async fn allow_processing(&self, scope: UsageScope) -> Result<bool, IoTBeeError>;
    async fn record(&self, scope: UsageScope, event: UsageEvent) -> Result<(), IoTBeeError>;
}

/// Preparado para un Stripe Meter/Price compatible. No se invoca mientras el
/// catálogo no declare explícitamente una configuración de medición externa.
#[async_trait]
pub trait UsageBillingReporter: Send + Sync {
    async fn report_delivered_messages(
        &self,
        organization_id: i64,
        cycle_start: DateTime<Utc>,
        quantity: u64,
    ) -> Result<(), IoTBeeError>;
}
