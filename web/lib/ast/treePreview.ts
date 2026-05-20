import type { Expr } from "./types";

const SYM: Record<string, string> = {
  add: "+",
  sub: "-",
  mul: "*",
  div: "/",
};

function nodeLabel(expr: Expr): string {
  if (expr.kind === "num") return String(expr.value);
  if (expr.kind === "var") return expr.name;
  return SYM[expr.op] ?? "?";
}

function renderNode(expr: Expr, prefix: string, isLast: boolean): string {
  const connector = isLast ? "└─ " : "├─ ";
  const label = nodeLabel(expr);
  let out = `${prefix}${connector}${label}\n`;
  if (expr.kind === "binop") {
    const childPrefix = prefix + (isLast ? "   " : "│  ");
    out += renderNode(expr.left, childPrefix, false);
    out += renderNode(expr.right, childPrefix, true);
  }
  return out;
}

export function treePreview(expr: Expr): string {
  if (expr.kind !== "binop") return nodeLabel(expr);
  let out = `${nodeLabel(expr)}\n`;
  out += renderNode(expr.left, "", false);
  out += renderNode(expr.right, "", true);
  return out.trimEnd();
}
