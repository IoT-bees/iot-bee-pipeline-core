use super::ast::Expr;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

// La definición de un campo
#[derive(Debug, Serialize, Deserialize)]
pub struct FieldSchema {
    // "type" es palabra reservada en Rust, así que
    // le damos un nombre interno distinto y le decimos
    // a serde que en el JSON se llama "type"
    #[serde(rename = "type")]
    pub field_type: FieldType,

    pub required: bool,

    // Option<Value> permite defaults numéricos ("default": 1013.25)
    // o de string ("default": "sensor_a"), o null/ausente → None
    pub default: Option<Value>,

    pub validation: Option<ValidationRule>,

    // None aquí significa "no transformar, pasar directo"
    pub operation: Option<Expr>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FieldType {
    Float,
    Int,
    Bool,
    String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationRule {
    pub min: Option<f64>,
    pub max: Option<f64>,
}

pub enum ProcessingOutcome {
    /// El record fue procesado y transformado exitosamente
    Processed(HashMap<String, Value>),

    /// El record no pasó validación — se descarta limpiamente, sin panic ni error
    Rejected(RejectionReason),
}

pub struct RejectionReason {
    pub field_name: String,
    pub reason: RejectionKind,
    /// El dato original que fue rechazado (JSON string)
    pub original_data: String,
}

#[derive(Debug)]
pub enum RejectionKind {
    MissingRequiredField,
    BelowMinimum { value: f64, min: f64 },
    ExceedsMaximum { value: f64, max: f64 },
    InvalidType { expected: &'static str },
}
