use async_trait::async_trait;
use domain::ast::processor::PipelineDataProcessor;
use domain::ast::schemas::FieldSchema;
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::{DomainValidationError, IoTBeeError};
use domain::outbound::data_processor_actions::DataProcessorActions;
use serde_json::Value;
use std::collections::HashMap;

pub struct PipelineDataProcessorCore {
    inner: PipelineDataProcessor,
}

impl PipelineDataProcessorCore {
    pub fn new(schema_json: &str) -> Result<Self, IoTBeeError> {
        let field_defs: HashMap<String, FieldSchema> =
            serde_json::from_str(schema_json).map_err(|e| {
                IoTBeeError::DomainValidationError(DomainValidationError::DataFormatError {
                    reason: format!("JSON de schema inválido: {}", e),
                })
            })?;

        Ok(PipelineDataProcessorCore {
            inner: PipelineDataProcessor::new(field_defs),
        })
    }

    pub fn process(
        &self,
        record: &HashMap<String, f64>,
    ) -> Result<HashMap<String, f64>, IoTBeeError> {
        self.inner.process(record)
    }
}

// Deserializa el JSON del schema almacenado en PipelineValidationSchemaModel
// en el tipo PipelineSchema que el compilador entiende.
#[async_trait]
impl DataProcessorActions for PipelineDataProcessorCore {
    async fn process_data(
        &self,
        data_to_process: &DataConsumerRawType,
    ) -> Result<DataConsumerRawType, IoTBeeError> {
        // 1. Parsear el payload crudo a un mapa numérico
        let record = parse_record(data_to_process.value())?;

        // 2. Procesar con el schema ya compilado: aplica operaciones y validaciones
        let output = self.process(&record)?;

        // 3. Serializar el resultado de vuelta a JSON y envolverlo en DataConsumerRawType
        let json =
            serde_json::to_string(&output).map_err(|e| DomainValidationError::DataFormatError {
                reason: format!("Error al serializar resultado: {}", e),
            })?;

        DataConsumerRawType::new(json)
    }
}

// Convierte un JSON string a HashMap<String, f64>.
// Soporta Number, Bool (true→1.0, false→0.0). Falla para otros tipos.
fn parse_record(json: &str) -> Result<HashMap<String, f64>, IoTBeeError> {
    let raw: HashMap<String, Value> =
        serde_json::from_str(json).map_err(|e| DomainValidationError::DataFormatError {
            reason: format!("JSON de datos inválido: {}", e),
        })?;

    let mut record = HashMap::new();
    for (key, val) in raw {
        let num: f64 = match val {
            Value::Number(n) => {
                n.as_f64()
                    .ok_or_else(|| DomainValidationError::DataFormatError {
                        reason: format!("Campo '{}' no puede convertirse a f64", key),
                    })?
            }
            Value::Bool(b) => {
                if b {
                    1.0
                } else {
                    0.0
                }
            }
            other => {
                return Err(DomainValidationError::DataFormatError {
                    reason: format!("Campo '{}' tiene tipo no soportado: {:?}", key, other),
                }
                .into());
            }
        };
        record.insert(key, num);
    }
    Ok(record)
}
