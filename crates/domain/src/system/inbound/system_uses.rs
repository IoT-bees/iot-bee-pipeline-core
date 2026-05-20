use async_trait::async_trait;

use crate::error::SystemError;
use crate::system::entities::system_status::SystemStatus;

#[async_trait]
pub trait SystemUseCases: Send + Sync {
    async fn status(&self) -> Result<SystemStatus, SystemError>;
}
