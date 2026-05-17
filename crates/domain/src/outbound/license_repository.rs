use crate::entities::license::{LicenseSubscription, StripeBillingSync};
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
}
