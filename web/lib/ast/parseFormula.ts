import type { BinOp, Expr, ParseResult } from "./types";

type Token =
  | { kind: "num"; value: number; pos: number }
  | { kind: "ident"; name: string; pos: number }
  | { kind: "op"; op: "+" | "-" | "*" | "/"; pos: number }
  | { kind: "lparen"; pos: number }
  | { kind: "rparen"; pos: number };

function tokenize(
  text: string,
): Token[] | { error: { pos: number; message: string } } {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/") {
      tokens.push({ kind: "op", op: c, pos: i });
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ kind: "lparen", pos: i });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ kind: "rparen", pos: i });
      i++;
      continue;
    }
    if (c >= "0" && c <= "9") {
      const start = i;
      while (i < text.length && text[i] >= "0" && text[i] <= "9") i++;
      if (text[i] === ".") {
        i++;
        while (i < text.length && text[i] >= "0" && text[i] <= "9") i++;
      }
      // Reject things like "1abc" — a digit run followed by a letter/underscore
      if (
        i < text.length &&
        ((text[i] >= "a" && text[i] <= "z") ||
          (text[i] >= "A" && text[i] <= "Z") ||
          text[i] === "_")
      ) {
        return {
          error: { pos: i, message: "unexpected character after number" },
        };
      }
      tokens.push({
        kind: "num",
        value: parseFloat(text.slice(start, i)),
        pos: start,
      });
      continue;
    }
    if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_") {
      const start = i;
      while (
        i < text.length &&
        ((text[i] >= "a" && text[i] <= "z") ||
          (text[i] >= "A" && text[i] <= "Z") ||
          (text[i] >= "0" && text[i] <= "9") ||
          text[i] === "_")
      )
        i++;
      tokens.push({ kind: "ident", name: text.slice(start, i), pos: start });
      continue;
    }
    return { error: { pos: i, message: `unexpected character "${c}"` } };
  }
  return tokens;
}

const PREC: Record<BinOp, number> = { add: 1, sub: 1, mul: 2, div: 2 };
const OP_TO_BINOP: Record<string, BinOp> = {
  "+": "add",
  "-": "sub",
  "*": "mul",
  "/": "div",
};

export function parseFormula(text: string): ParseResult {
  if (text.trim() === "") {
    return { ok: false, error: { pos: 0, message: "empty formula" } };
  }
  const tokResult = tokenize(text);
  if (!Array.isArray(tokResult)) {
    return { ok: false, error: tokResult.error };
  }
  const tokens = tokResult;
  let pos = 0;

  function peek(): Token | undefined {
    return tokens[pos];
  }
  function consume(): Token {
    return tokens[pos++];
  }

  function makeError(p: number, message: string): Error & {
    parserError: { pos: number; message: string };
  } {
    const err = new Error(message) as Error & {
      parserError: { pos: number; message: string };
    };
    err.parserError = { pos: p, message };
    return err;
  }

  function parseExpr(minPrec: number): Expr {
    let left = parseUnary();
    while (true) {
      const t = peek();
      if (!t || t.kind !== "op") break;
      const binop = OP_TO_BINOP[t.op];
      const prec = PREC[binop];
      if (prec < minPrec) break;
      consume();
      const right = parseExpr(prec + 1);
      left = { kind: "binop", op: binop, left, right };
    }
    return left;
  }

  function parseUnary(): Expr {
    const t = peek();
    if (t && t.kind === "op" && t.op === "-") {
      consume();
      const right = parseUnary();
      return {
        kind: "binop",
        op: "sub",
        left: { kind: "num", value: 0 },
        right,
      };
    }
    return parseFactor();
  }

  function parseFactor(): Expr {
    const t = peek();
    if (!t) throw makeError(text.length, "unexpected end of input");
    if (t.kind === "num") {
      consume();
      return { kind: "num", value: t.value };
    }
    if (t.kind === "ident") {
      consume();
      return { kind: "var", name: t.name };
    }
    if (t.kind === "lparen") {
      consume();
      const e = parseExpr(1);
      const close = peek();
      if (!close || close.kind !== "rparen") {
        throw makeError(close?.pos ?? text.length, "expected ')'");
      }
      consume();
      return e;
    }
    throw makeError(t.pos, "expected number, identifier, or '('");
  }

  try {
    const expr = parseExpr(1);
    if (pos < tokens.length) {
      return {
        ok: false,
        error: { pos: tokens[pos].pos, message: "unexpected trailing input" },
      };
    }
    return { ok: true, expr };
  } catch (e) {
    if (e && typeof e === "object" && "parserError" in e) {
      return {
        ok: false,
        error: (e as { parserError: { pos: number; message: string } })
          .parserError,
      };
    }
    throw e;
  }
}
