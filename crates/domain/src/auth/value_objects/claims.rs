use chrono::{DateTime, Utc};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct JwtClaims {
    pub user_id: i64,
    pub organization_id: i64,
    pub email: String,
    pub role: String,
    pub issued_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}
