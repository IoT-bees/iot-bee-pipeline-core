use domain::entities::license::BillingEvent;
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct BillingEventResponse {
    pub id: i64,
    #[serde(rename = "stripeEventId")]
    pub stripe_event_id: String,
    #[serde(rename = "eventType")]
    pub event_type: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "processedOk")]
    pub processed_ok: bool,
    #[serde(rename = "lastError")]
    pub last_error: Option<String>,
}

impl From<BillingEvent> for BillingEventResponse {
    fn from(e: BillingEvent) -> Self {
        Self {
            id: e.id,
            stripe_event_id: e.stripe_event_id,
            event_type: e.event_type,
            created_at: e.created_at.to_rfc3339(),
            processed_ok: e.processed_ok,
            last_error: e.last_error,
        }
    }
}

#[derive(Serialize, ToSchema)]
pub struct BillingEventsListResponse {
    pub items: Vec<BillingEventResponse>,
    #[serde(rename = "nextCursor")]
    pub next_cursor: Option<i64>,
}
