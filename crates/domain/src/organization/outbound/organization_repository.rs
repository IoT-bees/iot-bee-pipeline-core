use async_trait::async_trait;

use crate::error::OrganizationError;
use crate::organization::entities::organization::{Organization, UpdateOrganization};

#[async_trait]
pub trait OrganizationRepository: Send + Sync {
    async fn find_by_id(&self, id: i64) -> Result<Option<Organization>, OrganizationError>;
    async fn update(
        &self,
        id: i64,
        patch: UpdateOrganization,
    ) -> Result<Organization, OrganizationError>;
}
