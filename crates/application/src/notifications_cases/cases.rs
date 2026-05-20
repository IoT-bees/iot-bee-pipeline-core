use std::sync::Arc;

use async_trait::async_trait;
use domain::error::IoTBeeError;
use domain::notifications::outbound::notifier::Notifier;

use super::templates;

#[async_trait]
pub trait NotificationsUseCases: Send + Sync {
    async fn send_invite(
        &self,
        to: &str,
        inviter_name: &str,
        accept_url: &str,
    ) -> Result<(), IoTBeeError>;
    async fn send_password_reset(&self, to: &str, reset_url: &str) -> Result<(), IoTBeeError>;
    async fn send_payment_failed(
        &self,
        to: &str,
        plan: &str,
        update_url: &str,
    ) -> Result<(), IoTBeeError>;
    async fn send_suspension(&self, to: &str, reason: &str) -> Result<(), IoTBeeError>;
}

pub struct NotificationsUseCasesImpl {
    notifier: Arc<dyn Notifier>,
}

impl NotificationsUseCasesImpl {
    pub fn new(notifier: Arc<dyn Notifier>) -> Self {
        Self { notifier }
    }
}

#[async_trait]
impl NotificationsUseCases for NotificationsUseCasesImpl {
    async fn send_invite(
        &self,
        to: &str,
        inviter_name: &str,
        accept_url: &str,
    ) -> Result<(), IoTBeeError> {
        self.notifier
            .send_email(templates::invite(to, inviter_name, accept_url))
            .await
    }

    async fn send_password_reset(&self, to: &str, reset_url: &str) -> Result<(), IoTBeeError> {
        self.notifier
            .send_email(templates::password_reset(to, reset_url))
            .await
    }

    async fn send_payment_failed(
        &self,
        to: &str,
        plan: &str,
        update_url: &str,
    ) -> Result<(), IoTBeeError> {
        self.notifier
            .send_email(templates::payment_failed(to, plan, update_url))
            .await
    }

    async fn send_suspension(&self, to: &str, reason: &str) -> Result<(), IoTBeeError> {
        self.notifier
            .send_email(templates::suspension(to, reason))
            .await
    }
}
