import type { BinOp, Expr } from "./types";

const OP_TO_BACKEND: Record<BinOp, string> = {
  add: "Add",
  sub: "Sub",
  mul: "Mul",
  div: "Div",
};
const OP_FROM_BACKEND: Record<string, BinOp> = {
  Add: "add",
  Sub: "sub",
  Mul: "mul",
  Div: "div",
};

export function toBackend(expr: Expr): unknown {
  if (expr.kind === "num") return { type: "num", value: expr.value };
  if (expr.kind === "var") return { type: "var", name: expr.name };
  return {
    type: "bin_op",
    op: OP_TO_BACKEND[expr.op],
    left: toBackend(expr.left),
    right: toBackend(expr.right),
  };
}

function asObject(v: unknown): Record<string, unknown> | null {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

export function fromBackend(json: unknown): Expr | null {
  const obj = asObject(json);
  if (!obj) return null;
  const type = obj.type;
  if (type === "num") {
    if (typeof obj.value !== "number") return null;
    return { kind: "num", value: obj.value };
  }
  if (type === "var") {
    if (typeof obj.name !== "string") return null;
    return { kind: "var", name: obj.name };
  }
  if (type === "bin_op") {
    const op =
      typeof obj.op === "string" ? OP_FROM_BACKEND[obj.op] : undefined;
    if (!op) return null;
    const left = fromBackend(obj.left);
    const right = fromBackend(obj.right);
    if (!left || !right) return null;
    return { kind: "binop", op, left, right };
  }
  return null;
}
