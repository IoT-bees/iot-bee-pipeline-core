use serde::{Deserialize, Serialize};
use super::ast::Expr;

/// Definición de un campo dentro de un pipeline schema.
#[derive(Debug, Serialize, Deserialize)]
pub struct FieldSchema {
    /// Tipo del campo. `"type"` es palabra reservada en Rust,
    /// así que serde lo mapea desde el JSON como `"type"`.
    #[serde(rename = "type")]
    pub field_type: FieldType,

    /// Si `true` el campo debe estar presente en la entrada.
    pub required: bool,

    /// Valor por defecto cuando el campo es opcional y está ausente.
    #[serde(default)]
    pub default: Option<f64>,

    /// Restricciones de rango opcionales.
    #[serde(default)]
    pub validation: Option<ValidationRule>,

    /// Expresión de transformación. `None` = pasar el valor directo.
    #[serde(default)]
    pub operation: Option<Expr>,
}

/// Tipos de datos soportados para un campo.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FieldType {
    Float,
    Int,
    Bool,
}

/// Restricciones de rango mínimo/máximo para un campo numérico.
#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationRule {
    pub min: Option<f64>,
    pub max: Option<f64>,
}

/// Mapa completo de campos que compone un pipeline schema.
pub type PipelineSchemaMap = std::collections::HashMap<String, FieldSchema>;
