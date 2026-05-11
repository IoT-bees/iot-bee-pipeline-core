use async_trait::async_trait;
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::{DataExternalStoreError, IoTBeeError};
use domain::outbound::data_external_store::DataExternalStore;
use domain::value_objects::data_store_values::InfluxDbConfig;

use influxdb::Client;
// use influxdb::InfluxDbWriteable;
use influxdb::Timestamp;
use serde_json::Value;

pub struct InfluxDbPersistence {
    tag_fields: Vec<String>,
    measurement: String,
    client: Client,
}

impl InfluxDbPersistence {
    pub fn new(config: &InfluxDbConfig) -> Self {
        // FIX 1: .with_token() es requerido para InfluxDB Cloud v2.
        // Sin esto, todas las escrituras fallan con 401 Unauthorized.
        let client = Client::new(config.url(), config.data_base())
            .with_token(config.token());

        InfluxDbPersistence {
            tag_fields: config.tag_fields().to_vec(),
            measurement: config.measurement().to_string(),
            client,
        }
    }
}

#[async_trait]
impl DataExternalStore for InfluxDbPersistence {
    async fn save(&self, data: DataConsumerRawType) -> Result<(), IoTBeeError> {
        // 1. Parsear el JSON
        let json: Value = serde_json::from_str(&data.value()).map_err(|e| {
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
        // FIX 2: Nanosegundos en lugar de microsegundos.
        // InfluxDB Cloud v2 espera timestamps en nanosegundos por defecto.
        let timestamp = Timestamp::Nanoseconds(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos() as u128,
        );

        // FIX 4: Renombrado de __query__ a write_query.
        // El prefijo doble guión bajo está reservado por convención para
        // items generados por macros en Rust.
        let mut write_query = influxdb::WriteQuery::new(timestamp, &self.measurement);

        // FIX 3: Flag para detectar si se añadió al menos un field.
        // InfluxDB rechaza writes sin fields — validamos antes de enviar.
        let mut has_fields = false;

        for (key, value) in map {
            if self.tag_fields.contains(key) {
                // Tags → siempre String
                let tag_val = value
                    .as_str()
                    .ok_or_else(|| DataExternalStoreError::ParseError {
                        reason: format!("Tag '{}' must be a string", key),
                    })?;
                write_query = write_query.add_tag(key, tag_val);
            } else {
                // Fields → f64, i64, bool o String
                match value {
                    // FIX 5: Distinguir enteros de floats.
                    // Si se guarda todo como f64, InfluxDB puede rechazar
                    // escrituras futuras del mismo field con tipo entero,
                    // causando un "field type conflict".
                    Value::Number(n) => {
                        if let Some(i) = n.as_i64() {
                            write_query = write_query.add_field(key, i);
                            has_fields = true;
                        } else if let Some(f) = n.as_f64() {
                            write_query = write_query.add_field(key, f);
                            has_fields = true;
                        }
                    }
                    Value::String(s) => {
                        write_query = write_query.add_field(key, s.as_str());
                        has_fields = true;
                    }
                    Value::Bool(b) => {
                        write_query = write_query.add_field(key, *b);
                        has_fields = true;
                    }
                    _ => {} // ignorar nulls y arrays
                }
            }
        }

        // FIX 3: Rechazar explícitamente si no hay ningún field.
        // InfluxDB devuelve un error 400 silencioso en este caso;
        // mejor fallar aquí con un mensaje claro.
        if !has_fields {
            return Err(DataExternalStoreError::ParseError {
                reason: "Write query must contain at least one field (non-tag value)".to_string(),
            }
            .into());
        }

        // 3. Escribir en InfluxDB
        self.client
            .query(write_query)
            .await
            .map_err(|e: influxdb::Error| DataExternalStoreError::SaveFailed {
                reason: e.to_string(),
            })?;

        Ok(())
    }
}