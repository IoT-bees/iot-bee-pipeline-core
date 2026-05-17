use std::sync::Arc;

use async_trait::async_trait;

use domain::error::SystemError;
use domain::system::entities::system_status::SystemStatus;
use domain::system::inbound::system_uses::SystemUseCases;
use domain::system::outbound::system_status_probe::SystemStatusProbe;

pub struct SystemUseCasesImpl {
    probe: Arc<dyn SystemStatusProbe>,
}

impl SystemUseCasesImpl {
    pub fn new(probe: Arc<dyn SystemStatusProbe>) -> Self {
        Self { probe }
    }
}

#[async_trait]
impl SystemUseCases for SystemUseCasesImpl {
    async fn status(&self) -> Result<SystemStatus, SystemError> {
        self.probe.probe().await
    }
}
