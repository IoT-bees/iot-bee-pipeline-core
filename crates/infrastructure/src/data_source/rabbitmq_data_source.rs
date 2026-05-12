use async_trait::async_trait;
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::IoTBeeError;
use domain::outbound::data_source::DataSource;
use domain::value_objects::data_source_values::RabbitmqConfig;
use futures_util::StreamExt;
use tokio::sync::mpsc::Sender;
use uuid::Uuid;

use lapin::{Connection, ConnectionProperties, options::*, types::FieldTable};
use logging::AppLogger;
use std::time::Duration;

static LOGGER: AppLogger = AppLogger::new(
    "iot_bee::infrastructure::data_source::rabbitmq_data_source::RabbitMQDataSource",
);

pub struct RabbitMQDataSource {
    config: RabbitmqConfig,
    prefetch_count: u16,
    reconnect_delay: Duration,
    max_retries: u16,
    connection_timeout: Duration,
}
impl RabbitMQDataSource {
    pub fn new(config: RabbitmqConfig) -> Self {
        RabbitMQDataSource {
            config,
            prefetch_count: 10,
            reconnect_delay: Duration::from_secs(5),
            max_retries: 3,
            connection_timeout: Duration::from_secs(10),
        }
    }
    pub fn url(&self) -> &str {
        self.config.url()
    }
    pub fn queue_name(&self) -> &str {
        self.config.queue_name()
    }
    pub fn consumer_name(&self) -> &str {
        self.config.consumer_name()
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
            "Intentando conexión inicial a RabbitMQ. queue={}, consumer_tag={}, prefetch={}",
            queue_name, consumer_tag, prefetch_count,
        ));

        // ── Fase 1: Intento de conexión inicial con reintentos ─────────────────
        // Si se agotan los intentos, retornamos Err para que el actor se marque
        // como Degraded. max_retries == 0 significa reintentos ilimitados.
        let (channel, consumer) = {
            let mut attempts: u16 = 0;
            loop {
                match Self::connect_and_prepare_consumer(
                    &url,
                    &queue_name,
                    &consumer_tag,
                    prefetch_count,
                    connection_timeout,
                )
                .await
                {
                    Ok(ok) => break ok,
                    Err(reason) => {
                        attempts = attempts.saturating_add(1);
                        let should_retry = max_retries == 0 || attempts < max_retries;
                        if !should_retry {
                            LOGGER.error(&format!(
                                "No se pudo establecer conexión inicial con RabbitMQ tras {} intento(s): {}",
                                attempts, reason
                            ));
                            return Err(IoTBeeError::from(
                                domain::error::DataSourceError::ConnectionFailed { reason },
                            ));
                        }
                        let delay = Self::backoff_with_jitter(reconnect_delay, attempts);
                        LOGGER.warn(&format!(
                            "Conexión inicial fallida (intento {}): {}. Reintentando en {:.1}s...",
                            attempts,
                            reason,
                            delay.as_secs_f64()
                        ));
                        tokio::time::sleep(delay).await;
                    }
                }
            }
        };

        LOGGER.info("Conexión inicial a RabbitMQ establecida. Iniciando loop de consumo...");

        // ── Fase 2: Loop de consumo y reconexión ───────────────────────────────
        tokio::spawn(async move {
            Self::run_consume_loop(
                channel,
                consumer,
                sender,
                url,
                queue_name,
                consumer_tag,
                prefetch_count,
                reconnect_delay,
                max_retries,
                connection_timeout,
            )
            .await;
        });

        Ok(())
    }
}


impl RabbitMQDataSource {
    /// Loop de consumo ejecutado dentro del tokio::spawn tras la conexión inicial.
    /// Maneja el consumo de mensajes y la reconexión cuando el stream se cierra.
    #[allow(clippy::too_many_arguments)]
    async fn run_consume_loop(
        initial_channel: lapin::Channel,
        initial_consumer: lapin::Consumer,
        sender: Sender<DataConsumerRawType>,
        url: String,
        queue_name: String,
        consumer_tag: String,
        prefetch_count: u16,
        reconnect_delay: Duration,
        max_retries: u16,
        connection_timeout: Duration,
    ) {
        let mut channel = initial_channel;
        let mut consumer = initial_consumer;
        let mut reconnect_attempts: u16 = 0;

        'reconnect: loop {
            if sender.is_closed() {
                LOGGER.info("Sender closed. Stopping consumer task.");
                break;
            }

            // ── Loop de entrega de mensajes ────────────────────────────────────
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
                                LOGGER.warn("Consumer stream ended. Will attempt reconnection.");
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
                            LOGGER.warn("Receiver dropped while sending DTO. Stopping consumer");
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

            // ── Intento de reconexión tras fin del stream ──────────────────────
            reconnect_attempts = reconnect_attempts.saturating_add(1);
            let should_retry = max_retries == 0 || reconnect_attempts < max_retries;
            if !should_retry {
                LOGGER.error("Max retries exceeded after stream end. Consumer task stopping.");
                break;
            }

            let delay = Self::backoff_with_jitter(reconnect_delay, reconnect_attempts);
            LOGGER.warn(&format!(
                "Intentando reconexión a RabbitMQ en {:.1}s (intento {})...",
                delay.as_secs_f64(),
                reconnect_attempts
            ));
            tokio::time::sleep(delay).await;

            match Self::connect_and_prepare_consumer(
                &url,
                &queue_name,
                &consumer_tag,
                prefetch_count,
                connection_timeout,
            )
            .await
            {
                Ok((new_channel, new_consumer)) => {
                    reconnect_attempts = 0;
                    channel = new_channel;
                    consumer = new_consumer;
                    LOGGER.info("Reconexión a RabbitMQ exitosa.");
                }
                Err(e) => {
                    LOGGER.error(&format!(
                        "Reconexión fallida: {}. Se reintentará.",
                        e
                    ));
                }
            }
        }

        LOGGER.info("RabbitMQ consumer task finished.");
    }

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
