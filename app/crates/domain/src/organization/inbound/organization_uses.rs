use async_trait::async_trait;

use crate::error::OrganizationError;
use crate::organization::entities::organization::{Organization, UpdateOrganization};

#[async_trait]
pub trait OrganizationUseCases: Send + Sync {
    async fn read(&self, id: i64) -> Result<Organization, OrganizationError>;
    async fn update(
        &self,
        id: i64,
        patch: UpdateOrganization,
    ) -> Result<Organization, OrganizationError>;
    async fn delete_cascade(&self, id: i64) -> Result<(), OrganizationError>;
}
