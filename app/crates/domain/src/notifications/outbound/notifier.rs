use async_trait::async_trait;

use crate::error::IoTBeeError;

#[derive(Debug, Clone)]
pub struct EmailMessage {
    pub to: String,
    pub subject: String,
    pub html: String,
    pub text: String,
}

#[async_trait]
pub trait Notifier: Send + Sync {
    async fn send_email(&self, msg: EmailMessage) -> Result<(), IoTBeeError>;
}
