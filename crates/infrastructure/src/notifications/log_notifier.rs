use async_trait::async_trait;
use domain::error::IoTBeeError;
use domain::notifications::outbound::notifier::{EmailMessage, Notifier};
use logging::AppLogger;

static LOGGER: AppLogger = AppLogger::new("iot_bee::infrastructure::notifications::log");

pub struct LogNotifier;

#[async_trait]
impl Notifier for LogNotifier {
    async fn send_email(&self, msg: EmailMessage) -> Result<(), IoTBeeError> {
        LOGGER.info(&format!(
            "EMAIL→ {} | {} | {}",
            msg.to,
            msg.subject,
            msg.text.chars().take(120).collect::<String>()
        ));
        Ok(())
    }
}
