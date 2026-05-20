use async_trait::async_trait;

use crate::audit::entities::audit_event::{AuditEvent, AuditFilter, AuditPage};
use crate::error::AuditError;

#[async_trait]
pub trait AuditUseCases: Send + Sync {
    async fn list(
        &self,
        filter: AuditFilter,
        cursor: Option<i64>,
        limit: i64,
    ) -> Result<AuditPage, AuditError>;
    async fn purge_older_than(&self, days: u32) -> Result<u64, AuditError>;
    async fn list_recent_for(
        &self,
        organization_id: i64,
        n: i64,
    ) -> Result<Vec<AuditEvent>, AuditError>;
}
