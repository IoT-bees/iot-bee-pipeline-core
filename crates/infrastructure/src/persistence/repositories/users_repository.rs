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

type UserRow = (
    i64,
    i64,
    String,
    String,
    String,
    String,
    String,
    i64,
    String,
);

fn row_to_user(
    (id, organization_id, email, name, ph, role, status, must_reset, ca): UserRow,
) -> User {
    User {
        id,
        organization_id,
        email,
        name,
        password_hash: ph,
        role,
        status,
        must_reset_password: must_reset != 0,
        created_at: parse_dt(&ca).unwrap_or_else(|_| Utc::now()),
    }
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
        let row: Option<UserRow> = sqlx::query_as(
            "SELECT id, organization_id, email, name, password_hash, role, status, must_reset_password, created_at FROM users WHERE email = ?",
        )
        .bind(email)
        .fetch_optional(self.db.pool())
        .await
        .map_err(|e| AuthError::Internal { reason: e.to_string() })?;
        Ok(row.map(row_to_user))
    }

    async fn find_by_id(&self, id: i64) -> Result<Option<User>, AuthError> {
        let row: Option<UserRow> = sqlx::query_as(
            "SELECT id, organization_id, email, name, password_hash, role, status, must_reset_password, created_at FROM users WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(self.db.pool())
        .await
        .map_err(|e| AuthError::Internal { reason: e.to_string() })?;
        Ok(row.map(row_to_user))
    }

    async fn create(&self, new_user: NewUser) -> Result<User, AuthError> {
        let result = sqlx::query(
            "INSERT INTO users (organization_id, email, name, password_hash, role, status, must_reset_password) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(new_user.organization_id)
        .bind(&new_user.email)
        .bind(&new_user.name)
        .bind(&new_user.password_hash)
        .bind(&new_user.role)
        .bind(&new_user.status)
        .bind(if new_user.must_reset_password { 1_i64 } else { 0_i64 })
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

    async fn list_by_org(&self, organization_id: i64) -> Result<Vec<User>, AuthError> {
        let rows: Vec<UserRow> = sqlx::query_as(
            "SELECT id, organization_id, email, name, password_hash, role, status, must_reset_password, created_at \
             FROM users WHERE organization_id = ? ORDER BY id DESC",
        )
        .bind(organization_id)
        .fetch_all(self.db.pool())
        .await
        .map_err(|e| AuthError::Internal { reason: e.to_string() })?;
        Ok(rows.into_iter().map(row_to_user).collect())
    }

    async fn update_role(&self, id: i64, role: &str) -> Result<(), AuthError> {
        sqlx::query("UPDATE users SET role = ? WHERE id = ?")
            .bind(role)
            .bind(id)
            .execute(self.db.pool())
            .await
            .map_err(|e| AuthError::Internal {
                reason: e.to_string(),
            })?;
        Ok(())
    }

    async fn set_status(&self, id: i64, status: &str) -> Result<(), AuthError> {
        sqlx::query("UPDATE users SET status = ? WHERE id = ?")
            .bind(status)
            .bind(id)
            .execute(self.db.pool())
            .await
            .map_err(|e| AuthError::Internal {
                reason: e.to_string(),
            })?;
        Ok(())
    }

    async fn update_name(&self, id: i64, name: &str) -> Result<(), AuthError> {
        sqlx::query("UPDATE users SET name = ? WHERE id = ?")
            .bind(name)
            .bind(id)
            .execute(self.db.pool())
            .await
            .map_err(|e| AuthError::Internal {
                reason: e.to_string(),
            })?;
        Ok(())
    }

    async fn create_as_admin(&self, new_user: NewUser) -> Result<User, AuthError> {
        self.create(new_user).await
    }
}
