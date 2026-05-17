use async_trait::async_trait;

use crate::error::SystemError;
use crate::system::entities::system_status::SystemStatus;

#[async_trait]
pub trait SystemStatusProbe: Send + Sync {
    async fn probe(&self) -> Result<SystemStatus, SystemError>;
}
