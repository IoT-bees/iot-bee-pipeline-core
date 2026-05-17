use std::sync::Arc;

use async_trait::async_trait;

use domain::audit::entities::audit_event::{AuditFilter, AuditPage};
use domain::audit::inbound::audit_uses::AuditUseCases;
use domain::audit::outbound::audit_repository::AuditRepository;
use domain::error::AuditError;

pub struct AuditUseCasesImpl {
    repo: Arc<dyn AuditRepository>,
}

impl AuditUseCasesImpl {
    pub fn new(repo: Arc<dyn AuditRepository>) -> Self {
        Self { repo }
    }
}

#[async_trait]
impl AuditUseCases for AuditUseCasesImpl {
    async fn list(
        &self,
        filter: AuditFilter,
        cursor: Option<i64>,
        limit: i64,
    ) -> Result<AuditPage, AuditError> {
        self.repo.list(filter, cursor, limit).await
    }
}
