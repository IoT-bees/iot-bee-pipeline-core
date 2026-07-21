use async_trait::async_trait;

use crate::error::SystemError;
use crate::system::entities::contact_settings::{ContactSettings, UpdateContactSettings};
use crate::system::entities::system_status::SystemStatus;

#[async_trait]
pub trait SystemUseCases: Send + Sync {
    async fn status(&self) -> Result<SystemStatus, SystemError>;
    async fn contact_settings(&self) -> Result<ContactSettings, SystemError>;
    async fn update_contact_settings(
        &self,
        settings: UpdateContactSettings,
    ) -> Result<ContactSettings, SystemError>;
}
