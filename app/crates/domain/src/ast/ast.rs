use serde::{Deserialize, Serialize};

/// Nodo del árbol de expresiones del pipeline schema.
///
/// Serialización JSON con discriminante `"type"` en snake_case:
///   `{ "type": "num", "value": 3.0 }`    → Expr::Num
///   `{ "type": "var", "name": "x" }`     → Expr::Var
///   `{ "type": "bin_op", ... }`           → Expr::BinOp
///

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Expr {
    /// Constante numérica: `{ "type": "num", "value": 3.0 }`
    Num { value: f64 },
    /// Variable (campo del registro entrante): `{ "type": "var", "name": "temperatura" }`
    Var { name: String },
    /// Operación binaria entre dos sub-expresiones.
    /// `Box<Expr>` rompe la recursión de tamaño infinito.
    BinOp {
        op: Op,
        left: Box<Expr>,
        right: Box<Expr>,
    },
}

/// Operadores aritméticos soportados.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Op {
    Add,
    Sub,
    Mul,
    Div,
}
