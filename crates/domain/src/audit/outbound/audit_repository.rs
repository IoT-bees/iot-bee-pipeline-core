use async_trait::async_trait;

use crate::audit::entities::audit_event::{AuditFilter, AuditPage, NewAuditEvent};
use crate::error::AuditError;

#[async_trait]
pub trait AuditRepository: Send + Sync {
    async fn record(&self, event: NewAuditEvent) -> Result<(), AuditError>;
    async fn list(
        &self,
        filter: AuditFilter,
        cursor: Option<i64>,
        limit: i64,
    ) -> Result<AuditPage, AuditError>;
}
