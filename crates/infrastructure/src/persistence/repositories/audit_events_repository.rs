use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, NaiveDateTime, Utc};

use domain::audit::entities::audit_event::{AuditEvent, AuditFilter, AuditPage, NewAuditEvent};
use domain::audit::outbound::audit_repository::AuditRepository;
use domain::error::AuditError;

use crate::persistence::connection::InternalDataBase;

pub struct SqliteAuditEventsRepository {
    db: Arc<InternalDataBase>,
}

impl SqliteAuditEventsRepository {
    pub fn new(db: Arc<InternalDataBase>) -> Self {
        Self { db }
    }
}

fn parse_dt(raw: &str) -> DateTime<Utc> {
    NaiveDateTime::parse_from_str(raw, "%Y-%m-%d %H:%M:%S")
        .map(|n| n.and_utc())
        .unwrap_or_else(|_| Utc::now())
}

type Row = (
    i64,
    Option<i64>,
    Option<i64>,
    Option<String>,
    Option<String>,
    String,
    String,
    String,
    Option<i64>,
    Option<String>,
    String,
);

#[async_trait]
impl AuditRepository for SqliteAuditEventsRepository {
    async fn record(&self, e: NewAuditEvent) -> Result<(), AuditError> {
        sqlx::query(
            "INSERT INTO audit_events
                (organization_id, user_id, user_email, user_role, action, method, path, status_code, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(e.organization_id)
        .bind(e.user_id)
        .bind(e.user_email)
        .bind(e.user_role)
        .bind(e.action)
        .bind(e.method)
        .bind(e.path)
        .bind(e.status_code)
        .bind(e.ip_address)
        .execute(self.db.pool())
        .await
        .map_err(|err| AuditError::Persistence {
            reason: err.to_string(),
        })?;
        Ok(())
    }

    async fn list(
        &self,
        filter: AuditFilter,
        cursor: Option<i64>,
        limit: i64,
    ) -> Result<AuditPage, AuditError> {
        let limit = limit.clamp(1, 200);

        let mut sql = String::from(
            "SELECT id, organization_id, user_id, user_email, user_role, action, method, path, \
                    status_code, ip_address, created_at \
             FROM audit_events WHERE 1=1",
        );
        if filter.organization_id.is_some() {
            sql.push_str(" AND organization_id = ?");
        }
        if filter.user_id.is_some() {
            sql.push_str(" AND user_id = ?");
        }
        if filter.method.is_some() {
            sql.push_str(" AND method = ?");
        }
        if filter.path_contains.is_some() {
            sql.push_str(" AND path LIKE ?");
        }
        if filter.status_code.is_some() {
            sql.push_str(" AND status_code = ?");
        }
        if filter.from.is_some() {
            sql.push_str(" AND created_at >= ?");
        }
        if filter.to.is_some() {
            sql.push_str(" AND created_at <= ?");
        }
        if cursor.is_some() {
            sql.push_str(" AND id < ?");
        }
        sql.push_str(" ORDER BY id DESC LIMIT ?");

        let mut q = sqlx::query_as::<_, Row>(&sql);
        if let Some(v) = filter.organization_id {
            q = q.bind(v);
        }
        if let Some(v) = filter.user_id {
            q = q.bind(v);
        }
        if let Some(v) = filter.method.clone() {
            q = q.bind(v);
        }
        if let Some(v) = filter.path_contains.clone() {
            q = q.bind(format!("%{}%", v));
        }
        if let Some(v) = filter.status_code {
            q = q.bind(v);
        }
        if let Some(v) = filter.from {
            q = q.bind(v.format("%Y-%m-%d %H:%M:%S").to_string());
        }
        if let Some(v) = filter.to {
            q = q.bind(v.format("%Y-%m-%d %H:%M:%S").to_string());
        }
        if let Some(v) = cursor {
            q = q.bind(v);
        }
        q = q.bind(limit);

        let rows = q
            .fetch_all(self.db.pool())
            .await
            .map_err(|err| AuditError::Persistence {
                reason: err.to_string(),
            })?;

        let items: Vec<AuditEvent> = rows
            .into_iter()
            .map(
                |(id, org, uid, email, role, action, method, path, status, ip, ca)| AuditEvent {
                    id,
                    organization_id: org,
                    user_id: uid,
                    user_email: email,
                    user_role: role,
                    action,
                    method,
                    path,
                    status_code: status,
                    ip_address: ip,
                    created_at: parse_dt(&ca),
                },
            )
            .collect();

        let next_cursor = items.last().map(|e| e.id);
        Ok(AuditPage { items, next_cursor })
    }
}
