use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, NaiveDateTime, Utc};
use sqlx::{Postgres, QueryBuilder};

use domain::audit::entities::audit_event::{AuditEvent, AuditFilter, AuditPage, NewAuditEvent};
use domain::audit::outbound::audit_repository::AuditRepository;
use domain::error::AuditError;

use crate::persistence::connection::InternalDataBase;

pub struct PostgresAuditEventsRepository {
    db: Arc<InternalDataBase>,
}

impl PostgresAuditEventsRepository {
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
    Option<i32>,
    Option<String>,
    String,
);

#[async_trait]
impl AuditRepository for PostgresAuditEventsRepository {
    async fn record(&self, e: NewAuditEvent) -> Result<(), AuditError> {
        sqlx::query(
            "INSERT INTO audit_events
                (organization_id, user_id, user_email, user_role, action, method, path, status_code, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
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

        let mut query = QueryBuilder::<Postgres>::new(
            "SELECT id, organization_id, user_id, user_email, user_role, action, method, path, \
                    status_code, ip_address, created_at \
             FROM audit_events WHERE 1=1",
        );
        if let Some(value) = filter.organization_id {
            query.push(" AND organization_id = ");
            query.push_bind(value);
        }
        if let Some(value) = filter.user_id {
            query.push(" AND user_id = ");
            query.push_bind(value);
        }
        if let Some(value) = filter.method {
            query.push(" AND method = ");
            query.push_bind(value);
        }
        if let Some(value) = filter.path_contains {
            query.push(" AND path ILIKE ");
            query.push_bind(format!("%{}%", value));
        }
        if let Some(value) = filter.status_code {
            query.push(" AND status_code = ");
            query.push_bind(value);
        }
        if let Some(value) = filter.from {
            query.push(" AND created_at >= ");
            query.push_bind(value.format("%Y-%m-%d %H:%M:%S").to_string());
        }
        if let Some(value) = filter.to {
            query.push(" AND created_at <= ");
            query.push_bind(value.format("%Y-%m-%d %H:%M:%S").to_string());
        }
        if let Some(value) = cursor {
            query.push(" AND id < ");
            query.push_bind(value);
        }
        // Pedimos un registro adicional para informar con precisión si existe
        // otra página. Devolver el último id siempre obligaba al cliente a
        // hacer una petición vacía al llegar al final de la auditoría.
        query.push(" ORDER BY id DESC LIMIT ");
        query.push_bind(limit + 1);
        let rows = query
            .build_query_as::<Row>()
            .fetch_all(self.db.pool())
            .await
            .map_err(|err| AuditError::Persistence {
                reason: err.to_string(),
            })?;

        let has_next_page = rows.len() > limit as usize;
        let items: Vec<AuditEvent> = rows
            .into_iter()
            .take(limit as usize)
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
                    status_code: status.map(i64::from),
                    ip_address: ip,
                    created_at: parse_dt(&ca),
                },
            )
            .collect();

        let next_cursor = has_next_page.then(|| items.last().map(|e| e.id)).flatten();
        Ok(AuditPage { items, next_cursor })
    }

    async fn delete_older_than(&self, cutoff: DateTime<Utc>) -> Result<u64, AuditError> {
        let cutoff_str = cutoff.format("%Y-%m-%d %H:%M:%S").to_string();
        let res = sqlx::query("DELETE FROM audit_events WHERE created_at < $1")
            .bind(cutoff_str)
            .execute(self.db.pool())
            .await
            .map_err(|err| AuditError::Persistence {
                reason: err.to_string(),
            })?;
        Ok(res.rows_affected())
    }
}
