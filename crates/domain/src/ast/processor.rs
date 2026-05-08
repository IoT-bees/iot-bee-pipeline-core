use super::compiler::CompiledField;
use super::schemas::FieldSchema;
use super::vm::Vm;
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
        record: &HashMap<String, f64>,
    ) -> Result<HashMap<String, f64>, IoTBeeError> {
        let mut vm = self.vm.lock().unwrap();
        let mut output = HashMap::new();

        for (field_name, compiled) in &self.fields {
            // 1. Resolver el valor crudo
            let raw = match record.get(field_name) {
                Some(&v) => v,
                None => match compiled.default {
                    Some(d) => d,
                    None if compiled.required => {
                        return Err(IoTBeeError::DomainValidationError(
                            DomainValidationError::MissingField {
                                field_name: field_name.clone(),
                            },
                        ));
                    }
                    None => continue, // campo opcional ausente: omitir
                },
            };

            // 2. Validar contra min/max
            if let Some(rule) = &compiled.validation {
                if let Some(min) = rule.min {
                    if raw < min {
                        return Err(IoTBeeError::DomainValidationError(
                            DomainValidationError::MissingField {
                                field_name: field_name.clone(),
                            },
                        ));
                    }
                }
                if let Some(max) = rule.max {
                    if raw > max {
                        return Err(IoTBeeError::DomainValidationError(
                            DomainValidationError::MissingField {
                                field_name: field_name.clone(),
                            },
                        ));
                    }
                }
            }

            // 3. Ejecutar la operación (o pasar directo)
            let result = match &compiled.program {
                Some(prog) => vm.run(prog, record).map_err(|e| {
                    IoTBeeError::DomainValidationError(DomainValidationError::ValidationFailed {
                        reason: format!("Error al ejecutar programa: {}", e),
                    })
                })?,
                None => raw, // sin operación: el valor pasa tal cual
            };

            output.insert(field_name.clone(), result);
        }

        Ok(output)
    }
}
