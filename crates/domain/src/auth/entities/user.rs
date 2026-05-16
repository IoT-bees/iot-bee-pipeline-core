use chrono::{DateTime, Utc};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct User {
    pub id: i64,
    pub organization_id: i64,
    pub email: String,
    pub name: String,
    pub password_hash: String,
    pub role: String,
    pub status: String,
    pub must_reset_password: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct NewUser {
    pub organization_id: i64,
    pub email: String,
    pub name: String,
    pub password_hash: String,
    pub role: String,
    pub status: String,
    pub must_reset_password: bool,
}
