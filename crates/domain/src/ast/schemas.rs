use super::ast::Expr;
use serde::{Deserialize, Serialize};
use serde_json::Value;

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
