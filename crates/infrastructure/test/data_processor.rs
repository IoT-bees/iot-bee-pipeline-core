//! Tests del módulo data_processor.
//! Cubre: AST (serialización), Compiler (AST→bytecode), VM (ejecución),
//!        PipelineDataProcessorCore::new() + process(), y el trait DataProcessorActions.

use std::collections::HashMap;

use domain::ast::ast::{Expr, Op};
use domain::ast::compiler::{Instruction, Program};
use domain::ast::schemas::ProcessingOutcome;
use domain::ast::vm::{Vm, VmError};
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::outbound::data_processor_actions::DataProcessorActions;
use serde_json::Value;
// use domain::ast::processor::PipelineDataProcessorCore;
use infrastructure::data_processor::data_process::PipelineDataProcessorCore;

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn vars(pairs: &[(&str, f64)]) -> HashMap<String, f64> {
    pairs.iter().map(|(k, v)| (k.to_string(), *v)).collect()
}

fn record(pairs: &[(&str, f64)]) -> HashMap<String, Value> {
    pairs
        .iter()
        .map(|(k, v)| (k.to_string(), Value::from(*v)))
        .collect()
}

/// Desempaqueta un ProcessingOutcome::Processed en el HashMap interno.
/// Hace panic si el outcome es Rejected o es un error.
fn unwrap_processed(outcome: Result<ProcessingOutcome, domain::error::IoTBeeError>) -> HashMap<String, Value> {
    match outcome {
        Ok(ProcessingOutcome::Processed(output)) => output,
        Ok(ProcessingOutcome::Rejected(reason)) => {
            panic!("Se esperaba Processed pero se obtuvo Rejected: campo='{}', razón={:?}", 
                   reason.field_name, reason.reason);
        }
        Err(e) => panic!("Se esperaba Processed pero se obtuvo error: {}", e),
    }
}

/// Verifica que un ProcessingOutcome sea Rejected.
/// Hace panic si es Processed o un error.
fn assert_rejected(outcome: Result<ProcessingOutcome, domain::error::IoTBeeError>) {
    match outcome {
        Ok(ProcessingOutcome::Rejected(_)) => {}
        Ok(ProcessingOutcome::Processed(_)) => {
            panic!("Se esperaba Rejected pero se obtuvo Processed");
        }
        Err(e) => panic!("Se esperaba Rejected pero se obtuvo error: {}", e),
    }
}

/// Desempaqueta un ProcessingOutcome::Processed y lo convierte a JSON string.
/// Hace panic si el outcome es Rejected o es un error.
fn unwrap_processed_to_json(outcome: Result<ProcessingOutcome, domain::error::IoTBeeError>) -> String {
    match outcome {
        Ok(ProcessingOutcome::Processed(output)) => {
            serde_json::to_string(&output).expect("Failed to serialize output")
        }
        Ok(ProcessingOutcome::Rejected(reason)) => {
            panic!("Se esperaba Processed pero se obtuvo Rejected: campo='{}', razón={:?}", 
                   reason.field_name, reason.reason);
        }
        Err(e) => panic!("Se esperaba Processed pero se obtuvo error: {}", e),
    }
}

/// Compila una expresión y la ejecuta en una VM nueva.
fn run(expr: &Expr, v: &HashMap<String, f64>) -> Result<f64, VmError> {
    Vm::new().run(&Program::compile(expr), v)
}

fn approx(a: f64, b: f64) -> bool {
    (a - b).abs() < 1e-9
}

// ─── Schemas reutilizables ────────────────────────────────────────────────────

/// temperatura × 2 (multiplicación exacta en f64), con validación.
const SCHEMA_TEMP: &str = r#"{
    "temperatura": {
        "type": "float",
        "required": true,
        "validation": { "min": -50.0, "max": 150.0 },
        "operation": {
            "type": "bin_op", "op": "Mul",
            "left":  { "type": "var", "name": "temperatura" },
            "right": { "type": "num", "value": 2.0 }
        }
    }
}"#;

/// Conversión Celsius → Fahrenheit: temp × 1.8 + 32  (expresión anidada real).
const SCHEMA_CELSIUS_A_FAHRENHEIT: &str = r#"{
    "temperatura": {
        "type": "float",
        "required": true,
        "validation": { "min": -273.15, "max": 1000.0 },
        "operation": {
            "type": "bin_op", "op": "Add",
            "left": {
                "type": "bin_op", "op": "Mul",
                "left":  { "type": "var",  "name": "temperatura" },
                "right": { "type": "num",  "value": 1.8 }
            },
            "right": { "type": "num", "value": 32.0 }
        }
    }
}"#;

/// Campo sin operación (pass-through).
const SCHEMA_PASSTHROUGH: &str = r#"{
    "humedad": {
        "type": "float",
        "required": true,
        "validation": { "min": 0.0, "max": 100.0 }
    }
}"#;

/// Campo opcional con default.
const SCHEMA_DEFAULT: &str = r#"{
    "presion": {
        "type": "float",
        "required": false,
        "default": 1013.25
    }
}"#;

// ═════════════════════════════════════════════════════════════════════════════
// AST — Deserialización / Serialización
// ═════════════════════════════════════════════════════════════════════════════

#[test]
fn ast_deserializa_num() {
    let expr: Expr = serde_json::from_str(r#"{"type":"num","value":3.14}"#).unwrap();
    assert!(matches!(expr, Expr::Num { value } if value == 3.14));
}

#[test]
fn ast_deserializa_var() {
    let expr: Expr = serde_json::from_str(r#"{"type":"var","name":"temperatura"}"#).unwrap();
    assert!(matches!(expr, Expr::Var { ref name } if name == "temperatura"));
}

#[test]
fn ast_deserializa_bin_op_todos_los_operadores() {
    for (op_str, expected_op) in [
        ("Add", Op::Add),
        ("Sub", Op::Sub),
        ("Mul", Op::Mul),
        ("Div", Op::Div),
    ] {
        let json = format!(
            r#"{{"type":"bin_op","op":"{op_str}","left":{{"type":"num","value":1.0}},"right":{{"type":"num","value":2.0}}}}"#
        );
        let expr: Expr = serde_json::from_str(&json).unwrap();
        match expr {
            Expr::BinOp { op, .. } => {
                assert_eq!(
                    std::mem::discriminant(&op),
                    std::mem::discriminant(&expected_op)
                );
            }
            _ => panic!("Se esperaba BinOp"),
        }
    }
}

#[test]
fn ast_deserializa_bin_op_anidado() {
    // (a + b) * c
    let json = r#"{
        "type": "bin_op", "op": "Mul",
        "left": {
            "type": "bin_op", "op": "Add",
            "left":  { "type": "var", "name": "a" },
            "right": { "type": "var", "name": "b" }
        },
        "right": { "type": "num", "value": 2.0 }
    }"#;
    let expr: Expr = serde_json::from_str(json).unwrap();
    assert!(matches!(expr, Expr::BinOp { op: Op::Mul, .. }));
}

#[test]
fn ast_falla_con_tipo_desconocido() {
    assert!(serde_json::from_str::<Expr>(r#"{"type":"modulo","value":3.0}"#).is_err());
}

#[test]
fn ast_falla_con_json_vacio() {
    assert!(serde_json::from_str::<Expr>("{}").is_err());
}

#[test]
fn ast_serializacion_simetrica() {
    // Serializar y volver a deserializar debe dar el mismo resultado al ejecutar.
    let original = Expr::BinOp {
        op: Op::Add,
        left: Box::new(Expr::Var {
            name: "x".to_string(),
        }),
        right: Box::new(Expr::Num { value: 5.0 }),
    };
    let json = serde_json::to_string(&original).unwrap();
    let round_trip: Expr = serde_json::from_str(&json).unwrap();
    let v = vars(&[("x", 10.0)]);
    assert_eq!(run(&original, &v).unwrap(), run(&round_trip, &v).unwrap());
}

// ═════════════════════════════════════════════════════════════════════════════
// Compiler — AST → bytecode
// ═════════════════════════════════════════════════════════════════════════════

#[test]
fn compiler_num_emite_push_const() {
    let prog = Program::compile(&Expr::Num { value: 42.0 });
    assert_eq!(prog.instructions.len(), 1);
    assert!(matches!(prog.instructions[0], Instruction::PushConst(v) if v == 42.0));
}

#[test]
fn compiler_var_emite_push_var() {
    let prog = Program::compile(&Expr::Var {
        name: "x".to_string(),
    });
    assert_eq!(prog.instructions.len(), 1);
    assert!(matches!(&prog.instructions[0], Instruction::PushVar(n) if n == "x"));
}

#[test]
fn compiler_bin_op_orden_postfijo() {
    // a + b  →  PushVar(a), PushVar(b), Add
    let expr = Expr::BinOp {
        op: Op::Add,
        left: Box::new(Expr::Var {
            name: "a".to_string(),
        }),
        right: Box::new(Expr::Var {
            name: "b".to_string(),
        }),
    };
    let prog = Program::compile(&expr);
    assert_eq!(prog.instructions.len(), 3);
    assert!(matches!(&prog.instructions[0], Instruction::PushVar(n) if n == "a"));
    assert!(matches!(&prog.instructions[1], Instruction::PushVar(n) if n == "b"));
    assert!(matches!(prog.instructions[2], Instruction::Add));
}

#[test]
fn compiler_operacion_de_resta_emite_sub() {
    let expr = Expr::BinOp {
        op: Op::Sub,
        left: Box::new(Expr::Num { value: 1.0 }),
        right: Box::new(Expr::Num { value: 2.0 }),
    };
    let prog = Program::compile(&expr);
    assert!(matches!(prog.instructions[2], Instruction::Sub));
}

#[test]
fn compiler_operacion_de_div_emite_div() {
    let expr = Expr::BinOp {
        op: Op::Div,
        left: Box::new(Expr::Num { value: 1.0 }),
        right: Box::new(Expr::Num { value: 2.0 }),
    };
    let prog = Program::compile(&expr);
    assert!(matches!(prog.instructions[2], Instruction::Div));
}

#[test]
fn compiler_expresion_anidada_secuencia_correcta() {
    // (a + b) * 2.0  →  PushVar(a), PushVar(b), Add, PushConst(2.0), Mul
    let expr = Expr::BinOp {
        op: Op::Mul,
        left: Box::new(Expr::BinOp {
            op: Op::Add,
            left: Box::new(Expr::Var {
                name: "a".to_string(),
            }),
            right: Box::new(Expr::Var {
                name: "b".to_string(),
            }),
        }),
        right: Box::new(Expr::Num { value: 2.0 }),
    };
    let prog = Program::compile(&expr);
    assert_eq!(prog.instructions.len(), 5);
    assert!(matches!(&prog.instructions[0], Instruction::PushVar(n) if n == "a"));
    assert!(matches!(&prog.instructions[1], Instruction::PushVar(n) if n == "b"));
    assert!(matches!(prog.instructions[2], Instruction::Add));
    assert!(matches!(prog.instructions[3], Instruction::PushConst(v) if v == 2.0));
    assert!(matches!(prog.instructions[4], Instruction::Mul));
}

// ═════════════════════════════════════════════════════════════════════════════
// VM — Ejecución de bytecode
// ═════════════════════════════════════════════════════════════════════════════

#[test]
fn vm_suma_constantes() {
    let expr = Expr::BinOp {
        op: Op::Add,
        left: Box::new(Expr::Num { value: 3.0 }),
        right: Box::new(Expr::Num { value: 4.0 }),
    };
    assert_eq!(run(&expr, &vars(&[])).unwrap(), 7.0);
}

#[test]
fn vm_resta_izquierda_menos_derecha() {
    // 10 - 3 = 7  Y  3 - 10 = -7 (no conmutativa)
    let e1 = Expr::BinOp {
        op: Op::Sub,
        left: Box::new(Expr::Num { value: 10.0 }),
        right: Box::new(Expr::Num { value: 3.0 }),
    };
    let e2 = Expr::BinOp {
        op: Op::Sub,
        left: Box::new(Expr::Num { value: 3.0 }),
        right: Box::new(Expr::Num { value: 10.0 }),
    };
    assert_eq!(run(&e1, &vars(&[])).unwrap(), 7.0);
    assert_eq!(run(&e2, &vars(&[])).unwrap(), -7.0);
}

#[test]
fn vm_multiplicacion() {
    let expr = Expr::BinOp {
        op: Op::Mul,
        left: Box::new(Expr::Num { value: 5.0 }),
        right: Box::new(Expr::Num { value: 4.0 }),
    };
    assert_eq!(run(&expr, &vars(&[])).unwrap(), 20.0);
}

#[test]
fn vm_division_a_dividido_b_no_conmutativa() {
    // 10 / 4 = 2.5  Y  4 / 10 = 0.4
    let e1 = Expr::BinOp {
        op: Op::Div,
        left: Box::new(Expr::Num { value: 10.0 }),
        right: Box::new(Expr::Num { value: 4.0 }),
    };
    let e2 = Expr::BinOp {
        op: Op::Div,
        left: Box::new(Expr::Num { value: 4.0 }),
        right: Box::new(Expr::Num { value: 10.0 }),
    };
    assert_eq!(run(&e1, &vars(&[])).unwrap(), 2.5);
    assert!(approx(run(&e2, &vars(&[])).unwrap(), 0.4));
}

#[test]
fn vm_division_por_cero() {
    let expr = Expr::BinOp {
        op: Op::Div,
        left: Box::new(Expr::Num { value: 5.0 }),
        right: Box::new(Expr::Num { value: 0.0 }),
    };
    assert!(matches!(
        run(&expr, &vars(&[])),
        Err(VmError::DivisionByZero)
    ));
}

#[test]
fn vm_variable_indefinida_error() {
    let expr = Expr::Var {
        name: "inexistente".to_string(),
    };
    assert!(
        matches!(run(&expr, &vars(&[])), Err(VmError::UndefinedVar(ref n)) if n == "inexistente")
    );
}

#[test]
fn vm_resuelve_variable_del_registro() {
    let expr = Expr::Var {
        name: "x".to_string(),
    };
    assert_eq!(run(&expr, &vars(&[("x", 99.0)])).unwrap(), 99.0);
}

#[test]
fn vm_expresion_con_multiples_variables() {
    // (a + b) * c  →  (3 + 4) * 2 = 14
    let expr = Expr::BinOp {
        op: Op::Mul,
        left: Box::new(Expr::BinOp {
            op: Op::Add,
            left: Box::new(Expr::Var {
                name: "a".to_string(),
            }),
            right: Box::new(Expr::Var {
                name: "b".to_string(),
            }),
        }),
        right: Box::new(Expr::Var {
            name: "c".to_string(),
        }),
    };
    assert_eq!(
        run(&expr, &vars(&[("a", 3.0), ("b", 4.0), ("c", 2.0)])).unwrap(),
        14.0
    );
}

#[test]
fn vm_reutilizable_sin_residuo_de_ejecuciones_anteriores() {
    let expr = Expr::BinOp {
        op: Op::Add,
        left: Box::new(Expr::Var {
            name: "x".to_string(),
        }),
        right: Box::new(Expr::Num { value: 1.0 }),
    };
    let prog = Program::compile(&expr);
    let mut vm = Vm::new();
    assert_eq!(vm.run(&prog, &vars(&[("x", 10.0)])).unwrap(), 11.0);
    assert_eq!(vm.run(&prog, &vars(&[("x", 20.0)])).unwrap(), 21.0);
    assert_eq!(vm.run(&prog, &vars(&[("x", 0.0)])).unwrap(), 1.0);
}

#[test]
fn vm_programa_vacio_stack_underflow() {
    let prog = Program {
        instructions: vec![],
    };
    assert!(matches!(
        Vm::new().run(&prog, &vars(&[])),
        Err(VmError::StackUnderflow)
    ));
}

#[test]
fn vm_numeros_negativos() {
    let expr = Expr::BinOp {
        op: Op::Add,
        left: Box::new(Expr::Num { value: -5.0 }),
        right: Box::new(Expr::Num { value: -3.0 }),
    };
    assert_eq!(run(&expr, &vars(&[])).unwrap(), -8.0);
}

#[test]
fn vm_multiplicar_por_cero() {
    let expr = Expr::BinOp {
        op: Op::Mul,
        left: Box::new(Expr::Num { value: 0.0 }),
        right: Box::new(Expr::Num { value: 99999.0 }),
    };
    assert_eq!(run(&expr, &vars(&[])).unwrap(), 0.0);
}

#[test]
fn vm_expresion_profundamente_anidada() {
    // ((1 + 2) * (3 - 1)) / 2 = (3 * 2) / 2 = 3
    let expr = Expr::BinOp {
        op: Op::Div,
        left: Box::new(Expr::BinOp {
            op: Op::Mul,
            left: Box::new(Expr::BinOp {
                op: Op::Add,
                left: Box::new(Expr::Num { value: 1.0 }),
                right: Box::new(Expr::Num { value: 2.0 }),
            }),
            right: Box::new(Expr::BinOp {
                op: Op::Sub,
                left: Box::new(Expr::Num { value: 3.0 }),
                right: Box::new(Expr::Num { value: 1.0 }),
            }),
        }),
        right: Box::new(Expr::Num { value: 2.0 }),
    };
    assert_eq!(run(&expr, &vars(&[])).unwrap(), 3.0);
}

// ═════════════════════════════════════════════════════════════════════════════
// PipelineDataProcessorCore::new() — Construcción y validación del schema
// ═════════════════════════════════════════════════════════════════════════════

#[test]
fn new_schema_valido_con_operacion() {
    assert!(PipelineDataProcessorCore::new(SCHEMA_TEMP).is_ok());
}

#[test]
fn new_schema_valido_sin_operacion() {
    assert!(PipelineDataProcessorCore::new(SCHEMA_PASSTHROUGH).is_ok());
}

#[test]
fn new_schema_vacio_es_valido() {
    assert!(PipelineDataProcessorCore::new("{}").is_ok());
}

#[test]
fn new_schema_multiples_campos() {
    let schema = r#"{
        "a": { "type": "float", "required": true },
        "b": { "type": "int",   "required": true },
        "c": { "type": "bool",  "required": false, "default": 0.0 }
    }"#;
    assert!(PipelineDataProcessorCore::new(schema).is_ok());
}

#[test]
fn new_json_invalido_falla() {
    assert!(PipelineDataProcessorCore::new("esto no es json").is_err());
    assert!(PipelineDataProcessorCore::new("").is_err());
    assert!(PipelineDataProcessorCore::new("{{}invalid}").is_err());
}

#[test]
fn new_campo_sin_required_falla() {
    // `required` es obligatorio en FieldSchema
    let schema = r#"{ "x": { "type": "float" } }"#;
    assert!(PipelineDataProcessorCore::new(schema).is_err());
}

#[test]
fn new_tipo_desconocido_en_campo_falla() {
    let schema = r#"{ "x": { "type": "hexadecimal", "required": true } }"#;
    assert!(PipelineDataProcessorCore::new(schema).is_err());
}

// ═════════════════════════════════════════════════════════════════════════════
// PipelineDataProcessorCore::process() — Lógica de procesamiento
// ═════════════════════════════════════════════════════════════════════════════

#[test]
fn process_aplica_operacion_mul() {
    let p = PipelineDataProcessorCore::new(SCHEMA_TEMP).unwrap();
    let out = unwrap_processed(p.process(&record(&[("temperatura", 20.0)])));
    assert_eq!(out.get("temperatura").unwrap().as_f64().unwrap(), 40.0); // 20 * 2
}

#[test]
fn process_operacion_anidada_celsius_a_fahrenheit() {
    // 0°C → 32°F  (0 * 1.8 + 32 = 32)
    let p = PipelineDataProcessorCore::new(SCHEMA_CELSIUS_A_FAHRENHEIT).unwrap();
    let out = unwrap_processed(p.process(&record(&[("temperatura", 0.0)])));
    assert!(approx(
        out.get("temperatura").unwrap().as_f64().unwrap(),
        32.0
    ));

    // 100°C → 212°F
    let out2 = unwrap_processed(p.process(&record(&[("temperatura", 100.0)])));
    assert!(approx(
        out2.get("temperatura").unwrap().as_f64().unwrap(),
        212.0
    ));
}

#[test]
fn process_passthrough_sin_operacion() {
    let p = PipelineDataProcessorCore::new(SCHEMA_PASSTHROUGH).unwrap();
    let out = unwrap_processed(p.process(&record(&[("humedad", 65.0)])));
    assert_eq!(out.get("humedad").unwrap().as_f64().unwrap(), 65.0);
}

#[test]
fn process_campo_requerido_ausente_es_error() {
    let p = PipelineDataProcessorCore::new(SCHEMA_TEMP).unwrap();
    assert_rejected(p.process(&record(&[])));
}

#[test]
fn process_campo_opcional_ausente_usa_default() {
    let p = PipelineDataProcessorCore::new(SCHEMA_DEFAULT).unwrap();
    let out = unwrap_processed(p.process(&record(&[])));
    assert_eq!(out.get("presion").unwrap().as_f64().unwrap(), 1013.25);
}

#[test]
fn process_campo_opcional_presente_usa_valor_dado() {
    let p = PipelineDataProcessorCore::new(SCHEMA_DEFAULT).unwrap();
    let out = unwrap_processed(p.process(&record(&[("presion", 900.0)])));
    assert_eq!(out.get("presion").unwrap().as_f64().unwrap(), 900.0);
}

#[test]
fn process_validacion_min_rechaza_valor_bajo() {
    let p = PipelineDataProcessorCore::new(SCHEMA_TEMP).unwrap();
    assert_rejected(p.process(&record(&[("temperatura", -100.0)])));
}

#[test]
fn process_validacion_max_rechaza_valor_alto() {
    let p = PipelineDataProcessorCore::new(SCHEMA_TEMP).unwrap();
    assert_rejected(p.process(&record(&[("temperatura", 200.0)])));
}

#[test]
fn process_validacion_en_limite_exacto_es_valido() {
    let p = PipelineDataProcessorCore::new(SCHEMA_TEMP).unwrap();
    assert!(p.process(&record(&[("temperatura", -50.0)])).is_ok());
    assert!(p.process(&record(&[("temperatura", 150.0)])).is_ok());
}

#[test]
fn process_campos_extra_en_registro_son_ignorados() {
    // El schema solo define "temperatura"; "presion" no existe en el schema.
    let p = PipelineDataProcessorCore::new(SCHEMA_TEMP).unwrap();
    let out = unwrap_processed(p
        .process(&record(&[("temperatura", 10.0), ("presion", 9999.0)])));
    assert!(out.contains_key("temperatura"));
    assert!(!out.contains_key("presion"));
}

#[test]
fn process_schema_vacio_siempre_produce_salida_vacia() {
    let p = PipelineDataProcessorCore::new("{}").unwrap();
    let out = unwrap_processed(p
        .process(&record(&[("cualquier", 42.0), ("otro", 1.0)])));
    assert!(out.is_empty());
}

#[test]
fn process_multiples_campos_procesados_independientemente() {
    let schema = r#"{
        "a": {
            "type": "float", "required": true,
            "operation": {
                "type": "bin_op", "op": "Add",
                "left":  { "type": "var", "name": "a" },
                "right": { "type": "num", "value": 10.0 }
            }
        },
        "b": { "type": "float", "required": true }
    }"#;
    let p = PipelineDataProcessorCore::new(schema).unwrap();
    let out = unwrap_processed(p.process(&record(&[("a", 5.0), ("b", 3.0)])));
    assert_eq!(out.get("a").unwrap().as_f64().unwrap(), 15.0);
    assert_eq!(out.get("b").unwrap().as_f64().unwrap(), 3.0);
}

#[test]
fn process_reutilizable_multiples_llamadas() {
    let p = PipelineDataProcessorCore::new(SCHEMA_TEMP).unwrap();
    assert_eq!(
        unwrap_processed(p.process(&record(&[("temperatura", 0.0)])))
            .get("temperatura")
            .unwrap()
            .as_f64()
            .unwrap(),
        0.0
    );
    assert_eq!(
        unwrap_processed(p.process(&record(&[("temperatura", 10.0)])))
            .get("temperatura")
            .unwrap()
            .as_f64()
            .unwrap(),
        20.0
    );
    assert_eq!(
        unwrap_processed(p.process(&record(&[("temperatura", 25.0)])))
            .get("temperatura")
            .unwrap()
            .as_f64()
            .unwrap(),
        50.0
    );
}

#[test]
fn process_operacion_referencia_variable_ausente_en_registro() {
    // El schema espera que "temperatura" exista para la operación,
    // pero el registro no la trae → ExecutionError (UndefinedVar en la VM).
    let schema = r#"{
        "resultado": {
            "type": "float", "required": false, "default": 0.0,
            "operation": {
                "type": "bin_op", "op": "Mul",
                "left":  { "type": "var", "name": "temperatura" },
                "right": { "type": "num", "value": 2.0 }
            }
        }
    }"#;
    let p = PipelineDataProcessorCore::new(schema).unwrap();
    // "temperatura" no está en el registro, pero sí se usa en la operación
    assert!(p.process(&record(&[])).is_err());
}

// ═════════════════════════════════════════════════════════════════════════════
// DataProcessorActions::process_data() — Integración completa (async)
// ═════════════════════════════════════════════════════════════════════════════

#[actix_rt::test]
async fn process_data_json_valido_aplica_operacion() {
    let p = PipelineDataProcessorCore::new(SCHEMA_TEMP).unwrap();
    let dato = DataConsumerRawType::new(r#"{"temperatura": 20.0}"#).unwrap();
    let resultado = p.process_data(&dato).await.unwrap();
    let json_str = unwrap_processed_to_json(Ok(resultado));
    let json: HashMap<String, f64> = serde_json::from_str(&json_str).unwrap();
    assert_eq!(*json.get("temperatura").unwrap(), 40.0);
}

#[actix_rt::test]
async fn process_data_resultado_es_data_consumer_raw_type_valido() {
    let p = PipelineDataProcessorCore::new(SCHEMA_PASSTHROUGH).unwrap();
    let dato = DataConsumerRawType::new(r#"{"humedad": 70.0}"#).unwrap();
    let resultado = p.process_data(&dato).await.unwrap();
    let json_str = unwrap_processed_to_json(Ok(resultado));
    assert!(serde_json::from_str::<serde_json::Value>(&json_str).is_ok());
}

#[actix_rt::test]
async fn process_data_json_invalido_falla() {
    let p = PipelineDataProcessorCore::new(SCHEMA_TEMP).unwrap();
    let dato = DataConsumerRawType::new("esto no es json").unwrap();
    assert!(p.process_data(&dato).await.is_err());
}

#[actix_rt::test]
async fn process_data_json_vacio_falla_si_hay_campos_requeridos() {
    let p = PipelineDataProcessorCore::new(SCHEMA_TEMP).unwrap();
    let dato = DataConsumerRawType::new("{}").unwrap();
    assert_rejected(p.process_data(&dato).await);
}

#[actix_rt::test]
async fn process_data_campo_requerido_faltante_falla() {
    let p = PipelineDataProcessorCore::new(SCHEMA_TEMP).unwrap();
    let dato = DataConsumerRawType::new(r#"{"humedad": 50.0}"#).unwrap();
    assert_rejected(p.process_data(&dato).await);
}

#[actix_rt::test]
async fn process_data_valor_string_en_campo_numerico_falla() {
    let p = PipelineDataProcessorCore::new(SCHEMA_TEMP).unwrap();
    let dato = DataConsumerRawType::new(r#"{"temperatura": "caliente"}"#).unwrap();
    assert!(p.process_data(&dato).await.is_err());
}

#[actix_rt::test]
async fn process_data_valor_null_falla() {
    let p = PipelineDataProcessorCore::new(SCHEMA_TEMP).unwrap();
    let dato = DataConsumerRawType::new(r#"{"temperatura": null}"#).unwrap();
    assert_rejected(p.process_data(&dato).await);
}

#[actix_rt::test]
async fn process_data_objeto_anidado_falla() {
    let p = PipelineDataProcessorCore::new(SCHEMA_TEMP).unwrap();
    let dato = DataConsumerRawType::new(r#"{"temperatura": {"valor": 20.0}}"#).unwrap();
    assert!(p.process_data(&dato).await.is_err());
}

#[actix_rt::test]
async fn process_data_array_falla() {
    let p = PipelineDataProcessorCore::new(SCHEMA_TEMP).unwrap();
    let dato = DataConsumerRawType::new(r#"{"temperatura": [20.0, 30.0]}"#).unwrap();
    assert!(p.process_data(&dato).await.is_err());
}

#[actix_rt::test]
async fn process_data_bool_true_se_convierte_a_uno() {
    let schema = r#"{ "activo": { "type": "bool", "required": true } }"#;
    let p = PipelineDataProcessorCore::new(schema).unwrap();
    let dato = DataConsumerRawType::new(r#"{"activo": true}"#).unwrap();
    let resultado = p.process_data(&dato).await.unwrap();
    let json_str = unwrap_processed_to_json(Ok(resultado));
    let json: HashMap<String, f64> = serde_json::from_str(&json_str).unwrap();
    assert_eq!(*json.get("activo").unwrap(), 1.0);
}

#[actix_rt::test]
async fn process_data_bool_false_se_convierte_a_cero() {
    let schema = r#"{ "activo": { "type": "bool", "required": true } }"#;
    let p = PipelineDataProcessorCore::new(schema).unwrap();
    let dato = DataConsumerRawType::new(r#"{"activo": false}"#).unwrap();
    let resultado = p.process_data(&dato).await.unwrap();
    let json_str = unwrap_processed_to_json(Ok(resultado));
    let json: HashMap<String, f64> = serde_json::from_str(&json_str).unwrap();
    assert_eq!(*json.get("activo").unwrap(), 0.0);
}

#[actix_rt::test]
async fn process_data_campos_extra_ignorados_resultado_solo_tiene_campos_schema() {
    let p = PipelineDataProcessorCore::new(SCHEMA_TEMP).unwrap();
    let dato = DataConsumerRawType::new(r#"{"temperatura": 10.0, "campo_extra": 999.0}"#).unwrap();
    let resultado = p.process_data(&dato).await.unwrap();
    let json_str = unwrap_processed_to_json(Ok(resultado));
    let json: HashMap<String, f64> = serde_json::from_str(&json_str).unwrap();
    assert!(json.contains_key("temperatura"));
    assert!(!json.contains_key("campo_extra"));
}

#[actix_rt::test]
async fn process_data_schema_vacio_cualquier_json_produce_objeto_vacio() {
    let p = PipelineDataProcessorCore::new("{}").unwrap();
    let dato = DataConsumerRawType::new(r#"{"temperatura": 20.0}"#).unwrap();
    let resultado = p.process_data(&dato).await.unwrap();
    let json_str = unwrap_processed_to_json(Ok(resultado));
    let json: HashMap<String, f64> = serde_json::from_str(&json_str).unwrap();
    assert!(json.is_empty());
}

#[actix_rt::test]
async fn process_data_conversion_celsius_fahrenheit_end_to_end() {
    let p = PipelineDataProcessorCore::new(SCHEMA_CELSIUS_A_FAHRENHEIT).unwrap();

    let casos = [
        (0.0, 32.0),    // punto de congelación
        (100.0, 212.0), // punto de ebullición
        (37.0, 98.6),   // temperatura corporal
    ];

    for (celsius, fahrenheit_esperado) in casos {
        let dato = DataConsumerRawType::new(format!(r#"{{"temperatura": {celsius}}}"#)).unwrap();
        let resultado = p.process_data(&dato).await.unwrap();
        let json_str = unwrap_processed_to_json(Ok(resultado));
        let json: HashMap<String, f64> = serde_json::from_str(&json_str).unwrap();
        assert!(
            approx(*json.get("temperatura").unwrap(), fahrenheit_esperado),
            "{}°C debería ser {}°F, obtenido: {}",
            celsius,
            fahrenheit_esperado,
            json["temperatura"]
        );
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// Múltiples variables — schema con varios campos simultáneos
// ═════════════════════════════════════════════════════════════════════════════

const SCHEMA_MULTI: &str = r#"{
    "temperatura": {
        "type": "float",
        "required": true,
        "validation": { "min": -50.0, "max": 150.0 },
        "operation": {
            "type": "bin_op", "op": "Add",
            "left": {
                "type": "bin_op", "op": "Mul",
                "left":  { "type": "var",  "name": "temperatura" },
                "right": { "type": "num",  "value": 1.8 }
            },
            "right": { "type": "num", "value": 32.0 }
        }
    },
    "humedad": {
        "type": "float",
        "required": true,
        "validation": { "min": 0.0, "max": 100.0 },
        "operation": {
            "type": "bin_op", "op": "Mul",
            "left":  { "type": "var", "name": "humedad" },
            "right": { "type": "num", "value": 2.0 }
        }
    },
    "presion": {
        "type": "float",
        "required": false,
        "default": 1013.25,
        "validation": { "min": 800.0, "max": 1200.0 }
    }
}"#;

#[test]
fn process_multivariable_resultado_contiene_todos_los_campos_del_schema() {
    let p = PipelineDataProcessorCore::new(SCHEMA_MULTI).unwrap();
    let out = unwrap_processed(p
        .process(&record(&[
            ("temperatura", 25.0),
            ("humedad", 60.0),
            ("presion", 1000.0),
        ])));

    assert!(out.contains_key("temperatura"));
    assert!(out.contains_key("humedad"));
    assert!(out.contains_key("presion"));
}

#[test]
fn process_multivariable_cada_campo_se_procesa_independientemente() {
    let p = PipelineDataProcessorCore::new(SCHEMA_MULTI).unwrap();
    let out = unwrap_processed(p
        .process(&record(&[
            ("temperatura", 0.0), // 0 * 1.8 + 32 = 32
            ("humedad", 65.0),    // con operación ×2 → 130
            ("presion", 950.0),   // sin operación → 950
        ])));

    assert!(approx(
        out.get("temperatura").unwrap().as_f64().unwrap(),
        32.0
    ));
    assert_eq!(out.get("humedad").unwrap().as_f64().unwrap(), 130.0);
    assert_eq!(out.get("presion").unwrap().as_f64().unwrap(), 950.0);
}

#[test]
fn process_multivariable_campo_opcional_ausente_usa_default() {
    // "presion" no viene en el registro → debe usar 1013.25
    let p = PipelineDataProcessorCore::new(SCHEMA_MULTI).unwrap();
    let out = unwrap_processed(p
        .process(&record(&[("temperatura", 20.0), ("humedad", 50.0)])));

    assert_eq!(out.get("presion").unwrap().as_f64().unwrap(), 1013.25);
}

#[test]
fn process_multivariable_falla_si_falta_cualquier_campo_requerido() {
    let p = PipelineDataProcessorCore::new(SCHEMA_MULTI).unwrap();

    // falta temperatura
    assert_rejected(
        p.process(&record(&[("humedad", 50.0), ("presion", 1000.0)]))
    );
    // falta humedad
    assert_rejected(
        p.process(&record(&[("temperatura", 20.0), ("presion", 1000.0)]))
    );
}

#[test]
fn process_multivariable_validacion_falla_en_cualquier_campo() {
    let p = PipelineDataProcessorCore::new(SCHEMA_MULTI).unwrap();

    // temperatura fuera de rango
    assert!(
        p.process(&record(&[("temperatura", 200.0), ("humedad", 50.0)]))
            .is_err()
    );
    // humedad fuera de rango
    assert!(
        p.process(&record(&[("temperatura", 20.0), ("humedad", 150.0)]))
            .is_err()
    );
    // presion fuera de rango
    assert!(
        p.process(&record(&[
            ("temperatura", 20.0),
            ("humedad", 50.0),
            ("presion", 9999.0)
        ]))
        .is_err()
    );
}

#[actix_rt::test]
async fn process_data_multivariable_json_completo() {
    let p = PipelineDataProcessorCore::new(SCHEMA_MULTI).unwrap();
    let dato =
        DataConsumerRawType::new(r#"{"temperatura": 100.0, "humedad": 80.0, "presion": 1000.0}"#)
            .unwrap();

    let resultado = p.process_data(&dato).await.unwrap();
    let json_str = unwrap_processed_to_json(Ok(resultado));
    let json: HashMap<String, f64> = serde_json::from_str(&json_str).unwrap();

    // 100°C → 212°F
    assert!(approx(*json.get("temperatura").unwrap(), 212.0));
    assert_eq!(*json.get("humedad").unwrap(), 160.0); // 80 × 2
    assert_eq!(*json.get("presion").unwrap(), 1000.0);
}

#[actix_rt::test]
async fn process_data_multivariable_con_default() {
    // presion ausente en el JSON → default 1013.25
    let p = PipelineDataProcessorCore::new(SCHEMA_MULTI).unwrap();
    let dato = DataConsumerRawType::new(r#"{"temperatura": 37.0, "humedad": 55.0}"#).unwrap();

    let resultado = p.process_data(&dato).await.unwrap();
    let json_str = unwrap_processed_to_json(Ok(resultado));
    let json: HashMap<String, f64> = serde_json::from_str(&json_str).unwrap();

    assert!(approx(*json.get("temperatura").unwrap(), 98.6));
    assert_eq!(*json.get("humedad").unwrap(), 110.0); // 55 × 2
    assert_eq!(*json.get("presion").unwrap(), 1013.25);
}

#[actix_rt::test]
async fn process_data_multivariable_falla_si_falta_campo_requerido_en_json() {
    let p = PipelineDataProcessorCore::new(SCHEMA_MULTI).unwrap();

    // solo viene temperatura, falta humedad
    let dato = DataConsumerRawType::new(r#"{"temperatura": 20.0}"#).unwrap();
    assert!(p.process_data(&dato).await.is_err());
}

#[actix_rt::test]
async fn process_data_multivariable_falla_si_valor_fuera_de_rango() {
    let p = PipelineDataProcessorCore::new(SCHEMA_MULTI).unwrap();

    let dato = DataConsumerRawType::new(r#"{"temperatura": 20.0, "humedad": 999.0}"#).unwrap();
    assert!(p.process_data(&dato).await.is_err());
}
