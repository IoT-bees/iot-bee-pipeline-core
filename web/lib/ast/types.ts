export type BinOp = "add" | "sub" | "mul" | "div";

export type Expr =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string }
  | { kind: "binop"; op: BinOp; left: Expr; right: Expr };

export type ParseResult =
  | { ok: true; expr: Expr }
  | { ok: false; error: { pos: number; message: string } };
