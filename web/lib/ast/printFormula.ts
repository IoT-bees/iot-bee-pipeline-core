import type { BinOp, Expr } from "./types";

const PREC: Record<BinOp, number> = { add: 1, sub: 1, mul: 2, div: 2 };
const SYM: Record<BinOp, string> = {
  add: "+",
  sub: "-",
  mul: "*",
  div: "/",
};

function printNum(value: number): string {
  return Number.isFinite(value) ? String(value) : "NaN";
}

function printAt(expr: Expr, parentPrec: number, isRightChild: boolean): string {
  if (expr.kind === "num") return printNum(expr.value);
  if (expr.kind === "var") return expr.name;
  const prec = PREC[expr.op];
  const leftText = printAt(expr.left, prec, false);
  const rightText = printAt(expr.right, prec, true);
  const inner = `${leftText} ${SYM[expr.op]} ${rightText}`;
  const needsParens = prec < parentPrec || (prec === parentPrec && isRightChild);
  return needsParens ? `(${inner})` : inner;
}

export function printFormula(expr: Expr): string {
  return printAt(expr, 0, false);
}
