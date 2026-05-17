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
}
