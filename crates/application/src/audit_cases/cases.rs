use std::sync::Arc;

use async_trait::async_trait;
use chrono::{Duration, Utc};
use logging::AppLogger;

use domain::audit::entities::audit_event::{AuditEvent, AuditFilter, AuditPage, NewAuditEvent};
use domain::audit::inbound::audit_uses::AuditUseCases;
use domain::audit::outbound::audit_repository::AuditRepository;
use domain::error::AuditError;

static LOGGER: AppLogger = AppLogger::new("iot_bee::application::audit_cases::cases");

pub async fn record_auth_event(
    repo: &dyn AuditRepository,
    organization_id: Option<i64>,
    user_id: Option<i64>,
    email: Option<String>,
    action: &str,
    ip: Option<String>,
    status_code: i64,
) {
    let event = NewAuditEvent {
        organization_id,
        user_id,
        user_email: email,
        user_role: None,
        action: action.to_string(),
        method: "POST".to_string(),
        path: "/auth".to_string(),
        status_code: Some(status_code),
        ip_address: ip,
    };
    if let Err(e) = repo.record(event).await {
        LOGGER.warn(format!("audit auth event '{action}' failed: {e}"));
    }
}

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

    async fn purge_older_than(&self, days: u32) -> Result<u64, AuditError> {
        let cutoff = Utc::now() - Duration::days(days as i64);
        self.repo.delete_older_than(cutoff).await
    }

    async fn list_recent_for(
        &self,
        organization_id: i64,
        n: i64,
    ) -> Result<Vec<AuditEvent>, AuditError> {
        let filter = AuditFilter {
            organization_id: Some(organization_id),
            ..Default::default()
        };
        let page = self.repo.list(filter, None, n.clamp(1, 200)).await?;
        Ok(page.items)
    }
}

pub async fn purge_audit_older_than(
    repo: &dyn AuditRepository,
    days: u32,
) -> Result<u64, AuditError> {
    let cutoff = Utc::now() - Duration::days(days as i64);
    repo.delete_older_than(cutoff).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    use chrono::DateTime;
    use domain::audit::entities::audit_event::NewAuditEvent;

    struct StubRepo {
        last_cutoff: Mutex<Option<DateTime<Utc>>>,
    }

    #[async_trait]
    impl AuditRepository for StubRepo {
        async fn record(&self, _e: NewAuditEvent) -> Result<(), AuditError> {
            Ok(())
        }
        async fn list(
            &self,
            _filter: AuditFilter,
            _cursor: Option<i64>,
            _limit: i64,
        ) -> Result<AuditPage, AuditError> {
            Ok(AuditPage {
                items: vec![],
                next_cursor: None,
            })
        }
        async fn delete_older_than(&self, cutoff: DateTime<Utc>) -> Result<u64, AuditError> {
            *self.last_cutoff.lock().unwrap() = Some(cutoff);
            Ok(7)
        }
    }

    #[tokio::test]
    async fn purge_audit_older_than_passes_cutoff_in_the_past() {
        let stub = StubRepo {
            last_cutoff: Mutex::new(None),
        };
        let deleted = purge_audit_older_than(&stub, 30).await.unwrap();
        assert_eq!(deleted, 7);
        let cutoff = stub.last_cutoff.lock().unwrap().unwrap();
        let delta = Utc::now() - cutoff;
        assert!(delta.num_days() >= 29 && delta.num_days() <= 31);
    }
}
