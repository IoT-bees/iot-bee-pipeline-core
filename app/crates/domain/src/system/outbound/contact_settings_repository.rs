use async_trait::async_trait;

use crate::error::SystemError;
use crate::system::entities::contact_settings::{ContactSettings, UpdateContactSettings};

#[async_trait]
pub trait ContactSettingsRepository: Send + Sync {
    async fn read(&self) -> Result<ContactSettings, SystemError>;
    async fn update(&self, settings: UpdateContactSettings)
    -> Result<ContactSettings, SystemError>;
}
