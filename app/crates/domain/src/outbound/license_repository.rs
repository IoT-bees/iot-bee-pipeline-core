use crate::entities::license::{BillingEvent, LicenseSubscription, StripeBillingSync};
use crate::error::IoTBeeError;
use async_trait::async_trait;

#[async_trait]
pub trait LicenseRepository {
    async fn get_subscription(
        &self,
        organization_id: i64,
    ) -> Result<Option<LicenseSubscription>, IoTBeeError>;
    async fn upsert_subscription(
        &self,
        organization_id: i64,
        subscription: &LicenseSubscription,
    ) -> Result<(), IoTBeeError>;
    async fn deactivate_subscription(&self, organization_id: i64) -> Result<(), IoTBeeError>;
    async fn sync_stripe_subscription(
        &self,
        organization_id: i64,
        sync: &StripeBillingSync,
    ) -> Result<LicenseSubscription, IoTBeeError>;
    async fn list_billing_events(
        &self,
        organization_id: i64,
        limit: i64,
    ) -> Result<Vec<BillingEvent>, IoTBeeError>;
    async fn list_billing_events_page(
        &self,
        organization_id: i64,
        cursor: Option<i64>,
        limit: i64,
    ) -> Result<(Vec<BillingEvent>, Option<i64>), IoTBeeError> {
        let mut events = self.list_billing_events(organization_id, limit + 1).await?;
        if let Some(cursor) = cursor {
            events.retain(|event| event.id < cursor);
        }
        let limit = limit.clamp(1, 200) as usize;
        let has_next_page = events.len() > limit;
        events.truncate(limit);
        let next_cursor = has_next_page
            .then(|| events.last().map(|event| event.id))
            .flatten();
        Ok((events, next_cursor))
    }
    async fn get_billing_event(
        &self,
        organization_id: i64,
        id: i64,
    ) -> Result<Option<BillingEvent>, IoTBeeError>;
    async fn mark_billing_event_processed(
        &self,
        organization_id: i64,
        id: i64,
        ok: bool,
        error: Option<&str>,
    ) -> Result<(), IoTBeeError>;
}
