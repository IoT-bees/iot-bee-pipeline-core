use domain::ast::ast::{Expr, Op};
use domain::ast::compiler::Program;
use domain::error::{DomainValidationError, IoTBeeError};

fn nested_add(depth: usize) -> Expr {
    // Build "1 + 1 + 1 + ... + 1" as a left-leaning AST of `depth` BinOps.
    let mut expr = Expr::Num { value: 1.0 };
    for _ in 0..depth {
        expr = Expr::BinOp {
            op: Op::Add,
            left: Box::new(expr),
            right: Box::new(Expr::Num { value: 1.0 }),
        };
    }
    expr
}

#[test]
fn ast_compile_rejects_too_deeply_nested_formula() {
    let expr = nested_add(300);
    let result = Program::try_compile(&expr);
    assert!(
        matches!(
            result,
            Err(IoTBeeError::DomainValidationError(
                DomainValidationError::AstTooDeep { .. }
            ))
        ),
        "expected AstTooDeep error for over-deep AST, got: {:?}",
        result
    );
}

#[test]
fn ast_compile_accepts_reasonable_depth() {
    let expr = nested_add(64);
    let result = Program::try_compile(&expr);
    assert!(result.is_ok(), "depth=64 should compile, got: {:?}", result);
}
