use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, NaiveDateTime, Utc};

use domain::auth::entities::user::{NewUser, User};
use domain::auth::outbound::user_repository::UserRepository;
use domain::error::AuthError;

use crate::persistence::connection::InternalDataBase;

pub struct SqliteUserRepository {
    db: Arc<InternalDataBase>,
}

impl SqliteUserRepository {
    pub fn new(db: Arc<InternalDataBase>) -> Self {
        Self { db }
    }
}

fn parse_dt(raw: &str) -> Result<DateTime<Utc>, AuthError> {
    NaiveDateTime::parse_from_str(raw, "%Y-%m-%d %H:%M:%S")
        .map(|n| n.and_utc())
        .map_err(|e| AuthError::Internal {
            reason: e.to_string(),
        })
}

#[async_trait]
impl UserRepository for SqliteUserRepository {
    async fn count(&self) -> Result<i64, AuthError> {
        let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
            .fetch_one(self.db.pool())
            .await
            .map_err(|e| AuthError::Internal {
                reason: e.to_string(),
            })?;
        Ok(row.0)
    }

    async fn find_by_email(&self, email: &str) -> Result<Option<User>, AuthError> {
        let row: Option<(i64, String, String, String, String, String)> = sqlx::query_as(
            "SELECT id, email, name, password_hash, role, created_at FROM users WHERE email = ?",
        )
        .bind(email)
        .fetch_optional(self.db.pool())
        .await
        .map_err(|e| AuthError::Internal {
            reason: e.to_string(),
        })?;
        Ok(row.map(|(id, email, name, ph, role, ca)| User {
            id,
            email,
            name,
            password_hash: ph,
            role,
            created_at: parse_dt(&ca).unwrap_or_else(|_| Utc::now()),
        }))
    }

    async fn find_by_id(&self, id: i64) -> Result<Option<User>, AuthError> {
        let row: Option<(i64, String, String, String, String, String)> = sqlx::query_as(
            "SELECT id, email, name, password_hash, role, created_at FROM users WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(self.db.pool())
        .await
        .map_err(|e| AuthError::Internal {
            reason: e.to_string(),
        })?;
        Ok(row.map(|(id, email, name, ph, role, ca)| User {
            id,
            email,
            name,
            password_hash: ph,
            role,
            created_at: parse_dt(&ca).unwrap_or_else(|_| Utc::now()),
        }))
    }

    async fn create(&self, new_user: NewUser) -> Result<User, AuthError> {
        let result =
            sqlx::query("INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)")
                .bind(&new_user.email)
                .bind(&new_user.name)
                .bind(&new_user.password_hash)
                .bind(&new_user.role)
                .execute(self.db.pool())
                .await
                .map_err(|e| {
                    let msg = e.to_string();
                    if msg.contains("UNIQUE") {
                        AuthError::EmailAlreadyTaken {
                            email: new_user.email.clone(),
                        }
                    } else {
                        AuthError::Internal { reason: msg }
                    }
                })?;
        let id = result.last_insert_rowid();
        self.find_by_id(id).await?.ok_or(AuthError::Internal {
            reason: "user not found after insert".into(),
        })
    }
}
