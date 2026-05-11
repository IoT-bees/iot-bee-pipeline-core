use super::ast::{Expr, Op};
use super::schemas::{FieldSchema, FieldType, ValidationRule};
use serde_json::Value;

pub struct CompiledField {
    pub is_string: bool,
    pub required: bool,
    pub default: Option<Value>,
    pub validation: Option<ValidationRule>,
    // None = no hay operación, pasar valor directo
    pub program: Option<Program>,
}

impl From<FieldSchema> for CompiledField {
    fn from(field: FieldSchema) -> Self {
        let is_string = matches!(field.field_type, FieldType::String);
        let program = field.operation.map(|expr| Program::compile(&expr));
        CompiledField {
            is_string,
            required: field.required,
            default: field.default,
            validation: field.validation,
            program,
        }
    }
}

// Una instrucción individual del bytecode
#[derive(Debug, Clone)]
pub enum Instruction {
    // Empuja una constante a la stack
    PushConst(f64),

    // Empuja el valor de un campo del registro
    // El String es el nombre del campo (ej: "temperatura")
    PushVar(String),

    // Consume los dos valores del tope de la stack,
    // opera, y empuja el resultado
    Add,
    Sub,
    Mul,
    Div,
}

// Un programa compilado: listo para ejecutarse N veces
// sin volver a recorrer el árbol
#[derive(Debug, Clone)]
pub struct Program {
    pub instructions: Vec<Instruction>,
}

impl Program {
    // Punto de entrada: recibe la raíz del AST
    pub fn compile(expr: &Expr) -> Self {
        let mut instructions = Vec::new();
        compile_node(expr, &mut instructions);
        Program { instructions }
    }
}

// Recorre el árbol recursivamente y emite instrucciones.
// El orden es postfijo (post-order): primero los hijos,
// luego el operador. Esto es exactamente lo que necesita
// una stack machine.
fn compile_node(expr: &Expr, out: &mut Vec<Instruction>) {
    match expr {
        Expr::Num { value } => {
            // Un número constante: simplemente empújalo
            out.push(Instruction::PushConst(*value));
        }

        Expr::Var { name } => {
            // Una variable: empuja una instrucción que
            // en tiempo de ejecución buscará el valor
            out.push(Instruction::PushVar(name.clone()));
        }

        Expr::BinOp { op, left, right } => {
            // Primero compila el hijo izquierdo (empuja su valor)
            compile_node(left, out);
            // Luego el hijo derecho (empuja su valor encima)
            compile_node(right, out);
            // Finalmente emite el operador, que consume ambos
            match op {
                Op::Add => out.push(Instruction::Add),
                Op::Sub => out.push(Instruction::Sub),
                Op::Mul => out.push(Instruction::Mul),
                Op::Div => out.push(Instruction::Div),
            }
        }
    }
}
