use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::IoTBeeError;
use domain::outbound::data_source::DataSource;

use async_trait::async_trait;
use futures_util::StreamExt;
use tokio::sync::mpsc::Sender;
use uuid::Uuid;

use lapin::{Connection, ConnectionProperties, options::*, types::FieldTable};
use logging::AppLogger;
use serde::Deserialize;
use std::time::Duration;
static LOGGER: AppLogger = AppLogger::new(
    "iot_bee::infrastructure::data_source::rabbitmq_data_source::RabbitMQDataSource",
);

#[derive(Deserialize)]
pub struct RabbitMQConfig {
    pub url: String,
    pub queue_name: String,
    pub consumer_name: String,
}

pub struct RabbitMQDataSource {
    url: String,
    queue_name: String,
    consumer_name: String,
    prefetch_count: u16,
    reconnect_delay: Duration,
    max_retries: u16,
    connection_timeout: Duration,
}
impl RabbitMQDataSource {
    pub fn new(
        url: impl Into<String>,
        queue_name: impl Into<String>,
        consumer_name: impl Into<String>,
    ) -> Self {
        RabbitMQDataSource {
            url: url.into(),
            queue_name: queue_name.into(),
            consumer_name: consumer_name.into(),
            prefetch_count: 10,
            reconnect_delay: Duration::from_secs(5),
            max_retries: 5,
            connection_timeout: Duration::from_secs(10),
        }
    }
    pub fn url(&self) -> &str {
        &self.url
    }
    pub fn queue_name(&self) -> &str {
        &self.queue_name
    }
    pub fn consumer_name(&self) -> &str {
        &self.consumer_name
    }
    pub fn prefetch_count(&self) -> u16 {
        self.prefetch_count
    }
    pub fn reconnect_delay(&self) -> Duration {
        self.reconnect_delay
    }
    pub fn max_retries(&self) -> u16 {
        self.max_retries
    }
    pub fn connection_timeout(&self) -> Duration {
        self.connection_timeout
    }
}

#[async_trait]
impl DataSource for RabbitMQDataSource {
    async fn start_to_consume(
        &self,
        sender: Sender<DataConsumerRawType>,
    ) -> Result<(), IoTBeeError> {
        let url = self.url().to_string();
        let queue_name = self.queue_name().to_string();
        let prefetch_count = self.prefetch_count();
        let reconnect_delay = self.reconnect_delay();
        let max_retries = self.max_retries();
        let connection_timeout = self.connection_timeout();
        let consumer_tag = format!("{}-{}", self.consumer_name(), Uuid::new_v4());

        LOGGER.info(&format!(
            "Starting RabbitMQ consumer. queue={}, consumer_tag={}, prefetch={}, base_reconnect_delay_secs={}, max_retries={}",
            queue_name,
            consumer_tag,
            prefetch_count,
            reconnect_delay.as_secs(),
            max_retries
        ));

        tokio::spawn(async move {
            let mut attempts: u16 = 0;

            'reconnect: loop {
                if sender.is_closed() {
                    LOGGER.info("Sender is already closed. Stopping consumer task before connect");
                    break;
                }

                let setup = Self::connect_and_prepare_consumer(
                    &url,
                    &queue_name,
                    &consumer_tag,
                    prefetch_count,
                    connection_timeout,
                )
                .await;

                let (channel, mut consumer) = match setup {
                    Ok(ok) => {
                        attempts = 0;
                        LOGGER.info("RabbitMQ connection and consumer are ready");
                        ok
                    }
                    Err(err) => {
                        attempts = attempts.saturating_add(1);
                        LOGGER.error(&format!(
                            "RabbitMQ setup failed. attempt={}, reason={}",
                            attempts, err
                        ));

                        let should_retry = max_retries == 0 || attempts < max_retries;
                        if !should_retry {
                            LOGGER.error("Max retries reached. Consumer task will stop");
                            break;
                        }

                        let delay = Self::backoff_with_jitter(reconnect_delay, attempts);
                        LOGGER.warn(&format!(
                            "Retrying RabbitMQ connection in {:.1} seconds",
                            delay.as_secs_f64()
                        ));
                        tokio::time::sleep(delay).await;
                        continue 'reconnect;
                    }
                };

                loop {
                    let delivery_result = tokio::select! {
                        _ = sender.closed() => {
                            LOGGER.info("Sender closed. Canceling RabbitMQ consumer");
                            if let Err(e) = channel
                                .basic_cancel(consumer_tag.clone().into(), BasicCancelOptions::default())
                                .await
                            {
                                LOGGER.error(&format!("Error canceling consumer: {}", e));
                            }
                            break 'reconnect;
                        }
                        delivery = consumer.next() => {
                            match delivery {
                                Some(res) => res,
                                None => {
                                    LOGGER.warn("Consumer stream ended. Reconnecting");
                                    break;
                                }
                            }
                        }
                    };

                    match delivery_result {
                        Ok(delivery) => {
                            let parsed = DataConsumerRawType::new(
                                String::from_utf8_lossy(&delivery.data).to_string(),
                            );

                            let dto = match parsed {
                                Ok(v) => v,
                                Err(e) => {
                                    LOGGER.error(&format!(
                                        "Invalid payload, rejecting message. parse_error={}",
                                        e
                                    ));
                                    if let Err(nack_err) = delivery
                                        .nack(BasicNackOptions {
                                            requeue: false,
                                            ..Default::default()
                                        })
                                        .await
                                    {
                                        LOGGER.error(&format!(
                                            "Nack failed for invalid payload: {}",
                                            nack_err
                                        ));
                                    }
                                    continue;
                                }
                            };

                            if sender.send(dto).await.is_err() {
                                LOGGER
                                    .warn("Receiver dropped while sending DTO. Stopping consumer");
                                break 'reconnect;
                            }

                            if let Err(e) = delivery.ack(BasicAckOptions::default()).await {
                                LOGGER.error(&format!("Ack failed: {}", e));
                            }
                        }
                        Err(e) => {
                            LOGGER.error(&format!("Delivery error: {}", e));
                        }
                    }
                }

                attempts = attempts.saturating_add(1);
                let should_retry = max_retries == 0 || attempts < max_retries;
                if !should_retry {
                    LOGGER.error("Max retries reached after stream end. Consumer task will stop");
                    break;
                }

                let delay = Self::backoff_with_jitter(reconnect_delay, attempts);
                LOGGER.warn(&format!(
                    "Reconnecting after stream end in {:.1} seconds",
                    delay.as_secs_f64()
                ));
                tokio::time::sleep(delay).await;
            }

            LOGGER.info("RabbitMQ consumer task finished");
        });

        Ok(())
    }
}

impl RabbitMQDataSource {
    async fn connect_and_prepare_consumer(
        url: &str,
        queue_name: &str,
        consumer_tag: &str,
        prefetch_count: u16,
        connection_timeout: Duration,
    ) -> Result<(lapin::Channel, lapin::Consumer), String> {
        let connection = tokio::time::timeout(
            connection_timeout,
            Connection::connect(url, ConnectionProperties::default()),
        )
        .await
        .map_err(|_| {
            format!(
                "Connection timed out after {}s",
                connection_timeout.as_secs()
            )
        })?
        .map_err(|e| e.to_string())?;

        let channel = connection
            .create_channel()
            .await
            .map_err(|e| e.to_string())?;

        channel
            .basic_qos(prefetch_count, BasicQosOptions::default())
            .await
            .map_err(|e| e.to_string())?;

        channel
            .queue_declare(
                queue_name.into(),
                QueueDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                FieldTable::default(),
            )
            .await
            .map_err(|e| e.to_string())?;

        let consumer = channel
            .basic_consume(
                queue_name.into(),
                consumer_tag.into(),
                BasicConsumeOptions::default(),
                FieldTable::default(),
            )
            .await
            .map_err(|e| e.to_string())?;

        Ok((channel, consumer))
    }

    fn backoff_with_jitter(base: Duration, attempt: u16) -> Duration {
        let exp = 2u64.saturating_pow(attempt.min(6) as u32);
        let base_ms = base.as_millis() as u64;
        let max_ms = base_ms.saturating_mul(exp).min(60_000);
        let jitter = max_ms / 4;
        let actual = max_ms.saturating_sub(jitter / 2)
            + (std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .subsec_nanos() as u64
                % jitter.max(1));
        Duration::from_millis(actual)
    }
}
