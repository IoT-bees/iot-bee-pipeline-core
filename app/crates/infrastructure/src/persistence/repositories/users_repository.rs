use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, NaiveDateTime, Utc};
use sqlx::{Postgres, QueryBuilder};

use domain::auth::entities::user::{NewUser, User};
use domain::auth::outbound::user_repository::UserRepository;
use domain::error::AuthError;

use crate::persistence::connection::InternalDataBase;

pub struct PostgresUserRepository {
    db: Arc<InternalDataBase>,
}

impl PostgresUserRepository {
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
    bool,
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
        must_reset_password: must_reset,
        created_at: parse_dt(&ca).unwrap_or_else(|_| Utc::now()),
    }
}

#[async_trait]
impl UserRepository for PostgresUserRepository {
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
            "SELECT id, organization_id, email, name, password_hash, role, status, must_reset_password, created_at FROM users WHERE email = $1",
        )
        .bind(email)
        .fetch_optional(self.db.pool())
        .await
        .map_err(|e| AuthError::Internal { reason: e.to_string() })?;
        Ok(row.map(row_to_user))
    }

    async fn find_by_id(&self, id: i64) -> Result<Option<User>, AuthError> {
        let row: Option<UserRow> = sqlx::query_as(
            "SELECT id, organization_id, email, name, password_hash, role, status, must_reset_password, created_at FROM users WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(self.db.pool())
        .await
        .map_err(|e| AuthError::Internal { reason: e.to_string() })?;
        Ok(row.map(row_to_user))
    }

    async fn create(&self, new_user: NewUser) -> Result<User, AuthError> {
        let (id,): (i64,) = sqlx::query_as(
            "INSERT INTO users (organization_id, email, name, password_hash, role, status, must_reset_password) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
        )
        .bind(new_user.organization_id)
        .bind(&new_user.email)
        .bind(&new_user.name)
        .bind(&new_user.password_hash)
        .bind(&new_user.role)
        .bind(&new_user.status)
        .bind(new_user.must_reset_password)
        .fetch_one(self.db.pool())
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
        self.find_by_id(id).await?.ok_or(AuthError::Internal {
            reason: "user not found after insert".into(),
        })
    }

    async fn list_by_org(&self, organization_id: i64) -> Result<Vec<User>, AuthError> {
        let rows: Vec<UserRow> = sqlx::query_as(
            "SELECT id, organization_id, email, name, password_hash, role, status, must_reset_password, created_at \
             FROM users WHERE organization_id = $1 ORDER BY id DESC",
        )
        .bind(organization_id)
        .fetch_all(self.db.pool())
        .await
        .map_err(|e| AuthError::Internal { reason: e.to_string() })?;
        Ok(rows.into_iter().map(row_to_user).collect())
    }

    async fn list_by_org_page(
        &self,
        organization_id: i64,
        cursor: Option<i64>,
        limit: i64,
        search: Option<&str>,
        status: Option<&str>,
    ) -> Result<(Vec<User>, Option<i64>), AuthError> {
        let limit = limit.clamp(1, 200);
        let mut query = QueryBuilder::<Postgres>::new(
            "SELECT id, organization_id, email, name, password_hash, role, status, must_reset_password, created_at \
             FROM users WHERE organization_id = ",
        );
        query.push_bind(organization_id);
        if search.is_some_and(|value| !value.trim().is_empty()) {
            let pattern = format!("%{}%", search.unwrap().trim());
            query.push(" AND (email ILIKE ");
            query.push_bind(pattern.clone());
            query.push(" OR name ILIKE ");
            query.push_bind(pattern);
            query.push(')');
        }
        if let Some(status) = status {
            query.push(" AND status = ");
            query.push_bind(status);
        }
        if let Some(cursor) = cursor {
            query.push(" AND id < ");
            query.push_bind(cursor);
        }
        query.push(" ORDER BY id DESC LIMIT ");
        query.push_bind(limit + 1);
        let mut rows = query
            .build_query_as::<UserRow>()
            .fetch_all(self.db.pool())
            .await
            .map_err(|e| AuthError::Internal {
                reason: e.to_string(),
            })?;
        let has_next_page = rows.len() > limit as usize;
        rows.truncate(limit as usize);
        let users = rows.into_iter().map(row_to_user).collect::<Vec<_>>();
        let next_cursor = has_next_page
            .then(|| users.last().map(|user| user.id))
            .flatten();
        Ok((users, next_cursor))
    }

    async fn find_admin_by_org_id(&self, organization_id: i64) -> Result<Option<User>, AuthError> {
        let row: Option<UserRow> = sqlx::query_as(
            "SELECT id, organization_id, email, name, password_hash, role, status, must_reset_password, created_at \
             FROM users WHERE organization_id = $1 AND role = 'admin' ORDER BY id ASC LIMIT 1",
        )
        .bind(organization_id)
        .fetch_optional(self.db.pool())
        .await
        .map_err(|e| AuthError::Internal { reason: e.to_string() })?;
        Ok(row.map(row_to_user))
    }

    async fn update_role(&self, id: i64, role: &str) -> Result<(), AuthError> {
        sqlx::query("UPDATE users SET role = $1 WHERE id = $2")
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
        sqlx::query("UPDATE users SET status = $1 WHERE id = $2")
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
        sqlx::query("UPDATE users SET name = $1 WHERE id = $2")
            .bind(name)
            .bind(id)
            .execute(self.db.pool())
            .await
            .map_err(|e| AuthError::Internal {
                reason: e.to_string(),
            })?;
        Ok(())
    }

    async fn set_must_reset_password(&self, id: i64, must_reset: bool) -> Result<(), AuthError> {
        sqlx::query("UPDATE users SET must_reset_password = $1 WHERE id = $2")
            .bind(must_reset)
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
