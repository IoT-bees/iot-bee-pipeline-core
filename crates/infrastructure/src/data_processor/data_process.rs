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
        record: &HashMap<String, Value>,
    ) -> Result<HashMap<String, Value>, IoTBeeError> {
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
        // 1. Parsear el payload crudo a un mapa de valores
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

// Convierte un JSON string a HashMap<String, Value>.
// Soporta Number, Bool y String. Falla para arrays y objects anidados.
fn parse_record(json: &str) -> Result<HashMap<String, Value>, IoTBeeError> {
    let raw: HashMap<String, Value> =
        serde_json::from_str(json).map_err(|e| DomainValidationError::DataFormatError {
            reason: format!("JSON de datos inválido: {}", e),
        })?;

    for (key, val) in &raw {
        match val {
            Value::Number(_) | Value::Bool(_) | Value::String(_) => {}
            other => {
                return Err(DomainValidationError::DataFormatError {
                    reason: format!("Campo '{}' tiene tipo no soportado: {:?}", key, other),
                }
                .into());
            }
        }
    }

    Ok(raw)
}
