use async_trait::async_trait;
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::{DataExternalStoreError, IoTBeeError};
use domain::outbound::data_external_store::DataExternalStore;

use influxdb::Client;
// use influxdb::InfluxDbWriteable;
use influxdb::Timestamp;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize)]
pub struct InfluxDbStoreConfig {
    url: String,
    data_base: String,
    measurement: String,
    tag_fileds: Vec<String>,
}

pub struct InfluxDbPersistence {
    tag_fields: Vec<String>,
    measurement: String,
    client: Client,
}

impl InfluxDbPersistence {
    pub fn new(config: InfluxDbStoreConfig) -> Self {
        InfluxDbPersistence {
            tag_fields: config.tag_fileds,
            measurement: config.measurement,
            client: Client::new(&config.url, &config.data_base),
        }
    }
}

#[async_trait]
impl DataExternalStore for InfluxDbPersistence {
    async fn save(&self, data: DataConsumerRawType) -> Result<(), IoTBeeError> {
        // 1. Parsear el JSON

        let json: serde_json::Value = serde_json::from_str(&data.value()).map_err(|e| {
            DataExternalStoreError::ParseError {
                reason: e.to_string(),
            }
        })?;

        let map = json
            .as_object()
            .ok_or_else(|| DataExternalStoreError::ParseError {
                reason: "JSON must be an object".to_string(),
            })?;

        // 2. Construir el query dinámicamente
        let timestamp = Timestamp::Microseconds(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_micros() as u128,
        );
        let mut query = influxdb::WriteQuery::new(timestamp, &self.measurement);

        for (key, value) in map {
            if self.tag_fields.contains(key) {
                // es un tag → debe ser String
                let tag_val = value
                    .as_str()
                    .ok_or_else(|| DataExternalStoreError::ParseError {
                        reason: format!("Tag '{}' must be a string", key),
                    })?;
                query = query.add_tag(key, tag_val);
            } else {
                // es un field → puede ser f64, i64, bool, String
                match value {
                    Value::Number(n) => {
                        if let Some(f) = n.as_f64() {
                            query = query.add_field(key, f);
                        }
                    }
                    Value::String(s) => query = query.add_field(key, s.as_str()),
                    Value::Bool(b) => query = query.add_field(key, *b),
                    _ => {} // ignorar nulls y arrays
                }
            }
        }

        // 3. Escribir en InfluxDB
        self.client
            .query(query)
            .await
            .map_err(|e: influxdb::Error| DataExternalStoreError::SaveFailed {
                reason: e.to_string(),
            })?;

        Ok(())
    }
}
