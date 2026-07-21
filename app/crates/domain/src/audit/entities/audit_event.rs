use chrono::{DateTime, Utc};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuditEvent {
    pub id: i64,
    pub organization_id: Option<i64>,
    pub user_id: Option<i64>,
    pub user_email: Option<String>,
    pub user_role: Option<String>,
    pub action: String,
    pub method: String,
    pub path: String,
    pub status_code: Option<i64>,
    pub ip_address: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct NewAuditEvent {
    pub organization_id: Option<i64>,
    pub user_id: Option<i64>,
    pub user_email: Option<String>,
    pub user_role: Option<String>,
    pub action: String,
    pub method: String,
    pub path: String,
    pub status_code: Option<i64>,
    pub ip_address: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct AuditFilter {
    pub organization_id: Option<i64>,
    pub user_id: Option<i64>,
    pub method: Option<String>,
    pub path_contains: Option<String>,
    pub status_code: Option<i64>,
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone)]
pub struct AuditPage {
    pub items: Vec<AuditEvent>,
    pub next_cursor: Option<i64>,
}
