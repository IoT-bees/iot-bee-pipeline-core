use super::compiler::{Instruction, Program};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub enum VmError {
    // La stack quedó vacía cuando se esperaba un valor
    StackUnderflow,
    // Se usó una variable que no existe en el registro
    UndefinedVar(String),
    // División por cero
    DivisionByZero,
}
impl std::fmt::Display for VmError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            VmError::StackUnderflow => write!(
                f,
                "Stack underflow: no hay suficientes valores en la stack para ejecutar la operación"
            ),
            VmError::UndefinedVar(name) => write!(
                f,
                "Variable indefinida: no se encontró el campo '{}' en el registro",
                name
            ),
            VmError::DivisionByZero => write!(f, "División por cero: se intentó dividir por cero"),
        }
    }
}

pub struct Vm {
    // La stack es interna y se reutiliza entre ejecuciones
    // para evitar allocations repetidas. clear() la vacía
    // sin liberar la memoria del Vec.
    stack: Vec<f64>,
}

impl Vm {
    pub fn new() -> Self {
        // with_capacity pre-aloca espacio. Para expresiones
        // simples raramente necesitas más de 16 slots.
        Vm {
            stack: Vec::with_capacity(16),
        }
    }

    pub fn run(
        &mut self,
        program: &Program,
        // El registro: {"temperatura": 20.0, "humedad": 4.0}
        vars: &HashMap<String, f64>,
    ) -> Result<f64, VmError> {
        self.stack.clear();

        for instruction in &program.instructions {
            match instruction {
                Instruction::PushConst(n) => {
                    self.stack.push(*n);
                }

                Instruction::PushVar(name) => {
                    let val = vars
                        .get(name)
                        .ok_or_else(|| VmError::UndefinedVar(name.clone()))?;
                    self.stack.push(*val);
                }

                // Para operaciones binarias: saca dos valores,
                // opera, empuja el resultado.
                // Nota: `b` se saca primero (es el operando derecho),
                // `a` segundo (es el izquierdo).
                // Esto importa para resta y división: a - b, a / b
                Instruction::Add => {
                    let (a, b) = self.pop2()?;
                    self.stack.push(a + b);
                }
                Instruction::Sub => {
                    let (a, b) = self.pop2()?;
                    self.stack.push(a - b);
                }
                Instruction::Mul => {
                    let (a, b) = self.pop2()?;
                    self.stack.push(a * b);
                }
                Instruction::Div => {
                    let (a, b) = self.pop2()?;
                    if b == 0.0 {
                        return Err(VmError::DivisionByZero);
                    }
                    self.stack.push(a / b);
                }
            }
        }

        // Al final de un programa correcto, debe quedar
        // exactamente un valor en la stack: el resultado.
        self.stack.pop().ok_or(VmError::StackUnderflow)
    }

    // Saca dos valores: devuelve (izquierdo, derecho)
    fn pop2(&mut self) -> Result<(f64, f64), VmError> {
        let b = self.stack.pop().ok_or(VmError::StackUnderflow)?;
        let a = self.stack.pop().ok_or(VmError::StackUnderflow)?;
        Ok((a, b))
    }
}
