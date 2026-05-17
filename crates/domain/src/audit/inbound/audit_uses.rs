use async_trait::async_trait;

use crate::audit::entities::audit_event::{AuditFilter, AuditPage};
use crate::error::AuditError;

#[async_trait]
pub trait AuditUseCases: Send + Sync {
    async fn list(
        &self,
        filter: AuditFilter,
        cursor: Option<i64>,
        limit: i64,
    ) -> Result<AuditPage, AuditError>;
}
