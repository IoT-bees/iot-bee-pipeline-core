use std::sync::Arc;

use async_trait::async_trait;

use domain::error::OrganizationError;
use domain::organization::entities::organization::{Organization, UpdateOrganization};
use domain::organization::inbound::organization_uses::OrganizationUseCases;
use domain::organization::outbound::organization_repository::OrganizationRepository;

pub struct OrganizationUseCasesImpl {
    repo: Arc<dyn OrganizationRepository>,
}

impl OrganizationUseCasesImpl {
    pub fn new(repo: Arc<dyn OrganizationRepository>) -> Self {
        Self { repo }
    }
}

fn is_valid_slug(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 64
        && s.chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

#[async_trait]
impl OrganizationUseCases for OrganizationUseCasesImpl {
    async fn read(&self, id: i64) -> Result<Organization, OrganizationError> {
        self.repo
            .find_by_id(id)
            .await?
            .ok_or(OrganizationError::NotFound { id })
    }

    async fn update(
        &self,
        id: i64,
        patch: UpdateOrganization,
    ) -> Result<Organization, OrganizationError> {
        if let Some(ref slug) = patch.slug {
            if !is_valid_slug(slug) {
                return Err(OrganizationError::InvalidSlug {
                    reason: "must match ^[a-z0-9-]{1,64}$".into(),
                });
            }
        }
        self.repo.update(id, patch).await
    }

    async fn delete_cascade(&self, id: i64) -> Result<(), OrganizationError> {
        self.repo
            .find_by_id(id)
            .await?
            .ok_or(OrganizationError::NotFound { id })?;
        self.repo.delete_cascade(id).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    use chrono::Utc;

    struct MockRepo {
        existing: bool,
        calls: Mutex<Vec<String>>,
    }

    #[async_trait]
    impl OrganizationRepository for MockRepo {
        async fn find_by_id(&self, id: i64) -> Result<Option<Organization>, OrganizationError> {
            self.calls
                .lock()
                .unwrap()
                .push(format!("find_by_id({})", id));
            if self.existing {
                Ok(Some(Organization {
                    id,
                    name: "acme".into(),
                    slug: "acme".into(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                }))
            } else {
                Ok(None)
            }
        }
        async fn update(
            &self,
            _id: i64,
            _patch: UpdateOrganization,
        ) -> Result<Organization, OrganizationError> {
            unreachable!()
        }
        async fn delete_cascade(&self, id: i64) -> Result<(), OrganizationError> {
            self.calls
                .lock()
                .unwrap()
                .push(format!("delete_cascade({})", id));
            Ok(())
        }
    }

    #[tokio::test]
    async fn delete_cascade_checks_existence_first() {
        let repo = Arc::new(MockRepo {
            existing: true,
            calls: Mutex::new(vec![]),
        });
        let uc = OrganizationUseCasesImpl::new(repo.clone());
        uc.delete_cascade(42).await.unwrap();
        let calls = repo.calls.lock().unwrap().clone();
        assert_eq!(calls, vec!["find_by_id(42)", "delete_cascade(42)"]);
    }

    #[tokio::test]
    async fn delete_cascade_returns_not_found_for_missing_org() {
        let repo = Arc::new(MockRepo {
            existing: false,
            calls: Mutex::new(vec![]),
        });
        let uc = OrganizationUseCasesImpl::new(repo.clone());
        let err = uc.delete_cascade(7).await.unwrap_err();
        assert!(matches!(err, OrganizationError::NotFound { id: 7 }));
        let calls = repo.calls.lock().unwrap().clone();
        assert_eq!(calls, vec!["find_by_id(7)"]);
    }
}
