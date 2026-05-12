use super::compiler::CompiledField;
use super::schemas::FieldSchema;
use super::vm::Vm;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;

use crate::error::{DomainValidationError, IoTBeeError};

pub struct PipelineDataProcessor {
    fields: HashMap<String, CompiledField>,
    vm: Mutex<Vm>,
}

impl PipelineDataProcessor {
    pub fn new(fields: HashMap<String, FieldSchema>) -> Self {
        let compile_fields = fields
            .into_iter()
            .map(|(name, schema)| (name, schema.into()))
            .collect();

        PipelineDataProcessor {
            fields: compile_fields,
            vm: Mutex::new(Vm::new()),
        }
    }

    pub fn process(
        &self,
        record: &HashMap<String, Value>,
    ) -> Result<HashMap<String, Value>, IoTBeeError> {
        let mut vm = self.vm.lock().unwrap();
        let mut output: HashMap<String, Value> = HashMap::new();

        // Sub-mapa numérico del input para que el VM pueda resolver variables
        let numeric_record: HashMap<String, f64> = record
            .iter()
            .filter_map(|(k, v)| v.as_f64().map(|n| (k.clone(), n)))
            .collect();

        for (field_name, compiled) in &self.fields {
            if compiled.is_string {
                // Campo string: validate required, aplicar default, pass-through
                match record.get(field_name) {
                    Some(Value::String(s)) => {
                        output.insert(field_name.clone(), Value::String(s.clone()));
                    }
                    Some(v) if !v.is_null() => {
                        return Err(IoTBeeError::DomainValidationError(
                            DomainValidationError::InvalidFieldValue {
                                field_name: field_name.clone(),
                                reason: "expected a string value".to_string(),
                            },
                        ));
                    }
                    _ => {
                        // ausente o null
                        let effective_default = compiled.default.as_ref().filter(|d| !d.is_null());
                        match effective_default {
                            Some(d) => {
                                output.insert(field_name.clone(), d.clone());
                            }
                            None if compiled.required => {
                                return Err(IoTBeeError::DomainValidationError(
                                    DomainValidationError::MissingField {
                                        field_name: field_name.clone(),
                                    },
                                ));
                            }
                            None => {} // opcional sin default: omitir
                        }
                    }
                }
            } else {
                // Campo numérico: lógica existente
                let raw: f64 = match record.get(field_name).and_then(|v| match v {
                    Value::Number(n) => n.as_f64(),
                    Value::Bool(b) => Some(if *b { 1.0 } else { 0.0 }),
                    _ => None,
                }) {
                    Some(v) => v,
                    None => {
                        let effective_default = compiled
                            .default
                            .as_ref()
                            .filter(|d| !d.is_null())
                            .and_then(|d| d.as_f64());
                        match effective_default {
                            Some(d) => d,
                            None if compiled.required => {
                                return Err(IoTBeeError::DomainValidationError(
                                    DomainValidationError::MissingField {
                                        field_name: field_name.clone(),
                                    },
                                ));
                            }
                            None => continue, // campo opcional ausente: omitir
                        }
                    }
                };

                // Validar contra min/max
                if let Some(rule) = &compiled.validation {
                    if let Some(min) = rule.min {
                        if raw < min {
                            return Err(IoTBeeError::DomainValidationError(
                                DomainValidationError::InvalidFieldValue {
                                    field_name: field_name.clone(),
                                    reason: format!("value {} is below minimum {}", raw, min),
                                },
                            ));
                        }
                    }
                    if let Some(max) = rule.max {
                        if raw > max {
                            return Err(IoTBeeError::DomainValidationError(
                                DomainValidationError::InvalidFieldValue {
                                    field_name: field_name.clone(),
                                    reason: format!("value {} exceeds maximum {}", raw, max),
                                },
                            ));
                        }
                    }
                }

                // Ejecutar la operación (o pasar directo)
                let result = match &compiled.program {
                    Some(prog) => vm.run(prog, &numeric_record).map_err(|e| {
                        IoTBeeError::DomainValidationError(
                            DomainValidationError::ValidationFailed {
                                reason: format!("Error al ejecutar programa: {}", e),
                            },
                        )
                    })?,
                    None => raw,
                };

                let num = serde_json::Number::from_f64(result).ok_or_else(|| {
                    IoTBeeError::DomainValidationError(DomainValidationError::DataFormatError {
                        reason: format!(
                            "Campo '{}' resultó en un valor no representable (NaN/Inf)",
                            field_name
                        ),
                    })
                })?;
                output.insert(field_name.clone(), Value::Number(num));
            }
        }

        Ok(output)
    }
}
