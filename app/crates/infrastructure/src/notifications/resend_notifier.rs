use async_trait::async_trait;
use domain::error::{IoTBeeError, NotificationError};
use domain::notifications::outbound::notifier::{EmailMessage, Notifier};
use serde_json::json;

pub struct ResendNotifier {
    api_key: String,
    from: String,
    reply_to: Option<String>,
    http: reqwest::Client,
}

impl ResendNotifier {
    pub fn new(api_key: String, from: String, reply_to: Option<String>) -> Self {
        Self {
            api_key,
            from,
            reply_to,
            http: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl Notifier for ResendNotifier {
    async fn send_email(&self, msg: EmailMessage) -> Result<(), IoTBeeError> {
        let mut body = json!({
            "from": self.from,
            "to": [msg.to],
            "subject": msg.subject,
            "html": msg.html,
            "text": msg.text,
        });
        if let Some(rt) = &self.reply_to {
            body["reply_to"] = json!(rt);
        }
        let res = self
            .http
            .post("https://api.resend.com/emails")
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| NotificationError::Transport {
                reason: e.to_string(),
            })?;
        if !res.status().is_success() {
            let status = res.status();
            let text = res.text().await.unwrap_or_default();
            return Err(NotificationError::Transport {
                reason: format!("resend {status}: {text}"),
            }
            .into());
        }
        Ok(())
    }
}
