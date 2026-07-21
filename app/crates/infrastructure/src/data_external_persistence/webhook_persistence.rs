use async_trait::async_trait;
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::{DataExternalStoreError, IoTBeeError};
use domain::outbound::data_external_store::DataExternalStore;
use domain::value_objects::data_store_values::WebhookConfig;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use reqwest::{Client, Url};
use serde_json::Value;
use std::time::Duration;
use tokio::time::sleep;

use logging::AppLogger;

static LOGGER: AppLogger =
    AppLogger::new("iot_bee::infrastructure::data_external_persistence::webhook_persistence");

const MAX_DELIVERY_ATTEMPTS: u8 = 3;
const RETRY_DELAY: Duration = Duration::from_millis(250);

pub struct WebhookPersistence {
    url: Url,
    bearer_token: Option<String>,
    client: Client,
}

impl WebhookPersistence {
    pub fn new(config: &WebhookConfig) -> Result<Self, IoTBeeError> {
        let url =
            Url::parse(config.url()).map_err(|error| DataExternalStoreError::ConnectionFailed {
                reason: format!("Invalid webhook URL: {error}"),
            })?;
        if !matches!(url.scheme(), "http" | "https") {
            return Err(DataExternalStoreError::ConnectionFailed {
                reason: "Webhook URL must use HTTP or HTTPS".to_string(),
            }
            .into());
        }
        let client = Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .map_err(|error| DataExternalStoreError::ConnectionFailed {
                reason: error.to_string(),
            })?;

        Ok(Self {
            url,
            bearer_token: config.bearer_token().map(str::to_owned),
            client,
        })
    }
}

#[async_trait]
impl DataExternalStore for WebhookPersistence {
    async fn save(&self, data: DataConsumerRawType) -> Result<(), IoTBeeError> {
        serde_json::from_str::<Value>(data.value()).map_err(|error| {
            DataExternalStoreError::ParseError {
                reason: format!("Webhook payload must be valid JSON: {error}"),
            }
        })?;

        for attempt in 1..=MAX_DELIVERY_ATTEMPTS {
            let mut request = self
                .client
                .post(self.url.clone())
                .header(CONTENT_TYPE, "application/json")
                .body(data.value().to_owned());

            if let Some(token) = &self.bearer_token {
                request = request.header(AUTHORIZATION, format!("Bearer {token}"));
            }

            match request.send().await {
                Ok(response) if response.status().is_success() => return Ok(()),
                Ok(response) => {
                    let status = response.status();
                    if !is_retryable_status(status) || attempt == MAX_DELIVERY_ATTEMPTS {
                        return Err(DataExternalStoreError::SaveFailed {
                            reason: format!(
                                "Webhook returned HTTP {status} after {attempt} delivery attempt(s)"
                            ),
                        }
                        .into());
                    }

                    LOGGER.warn(&format!(
                        "Webhook returned HTTP {status}; retrying delivery ({attempt}/{MAX_DELIVERY_ATTEMPTS})"
                    ));
                }
                Err(error) => {
                    if attempt == MAX_DELIVERY_ATTEMPTS {
                        return Err(DataExternalStoreError::ConnectionFailed {
                            reason: format!(
                                "Webhook delivery failed after {attempt} attempt(s): {error}"
                            ),
                        }
                        .into());
                    }

                    LOGGER.warn(&format!(
                        "Webhook delivery attempt {attempt}/{MAX_DELIVERY_ATTEMPTS} failed: {error}. Retrying."
                    ));
                }
            }

            sleep(RETRY_DELAY).await;
        }

        unreachable!("The delivery loop returns on its final attempt")
    }
}

fn is_retryable_status(status: reqwest::StatusCode) -> bool {
    status.is_server_error() || matches!(status.as_u16(), 408 | 429)
}
