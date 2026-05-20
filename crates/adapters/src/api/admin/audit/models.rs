use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

#[derive(Deserialize, IntoParams)]
pub struct AuditListQuery {
    pub user_id: Option<i64>,
    pub method: Option<String>,
    pub path_contains: Option<String>,
    pub status: Option<i64>,
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
    pub cursor: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize, ToSchema)]
pub struct AuditEventResponse {
    pub id: i64,
    #[serde(rename = "organizationId")]
    pub organization_id: Option<i64>,
    #[serde(rename = "userId")]
    pub user_id: Option<i64>,
    #[serde(rename = "userEmail")]
    pub user_email: Option<String>,
    #[serde(rename = "userRole")]
    pub user_role: Option<String>,
    pub action: String,
    pub method: String,
    pub path: String,
    #[serde(rename = "statusCode")]
    pub status_code: Option<i64>,
    #[serde(rename = "ipAddress")]
    pub ip_address: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Serialize, ToSchema)]
pub struct AuditListResponse {
    pub items: Vec<AuditEventResponse>,
    #[serde(rename = "nextCursor")]
    pub next_cursor: Option<i64>,
}
