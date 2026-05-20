use crate::entities::license::{BillingEvent, LicenseSubscription, StripeBillingSync};
use crate::error::IoTBeeError;
use async_trait::async_trait;

#[async_trait]
pub trait LicenseRepository {
    async fn get_subscription(&self) -> Result<Option<LicenseSubscription>, IoTBeeError>;
    async fn upsert_subscription(
        &self,
        subscription: &LicenseSubscription,
    ) -> Result<(), IoTBeeError>;
    async fn deactivate_subscription(&self) -> Result<(), IoTBeeError>;
    async fn sync_stripe_subscription(
        &self,
        sync: &StripeBillingSync,
    ) -> Result<LicenseSubscription, IoTBeeError>;
    async fn list_billing_events(&self, limit: i64) -> Result<Vec<BillingEvent>, IoTBeeError>;
    async fn get_billing_event(&self, id: i64) -> Result<Option<BillingEvent>, IoTBeeError>;
    async fn mark_billing_event_processed(
        &self,
        id: i64,
        ok: bool,
        error: Option<&str>,
    ) -> Result<(), IoTBeeError>;
}
