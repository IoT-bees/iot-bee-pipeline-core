# Spec C — Visual schema + AST builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `<textarea>` JSON schema editor with a tabular field builder and an Excel-style formula editor. A non-engineer must be able to define fields, validations and per-field formulas without ever seeing JSON or knowing that there is an AST behind the scenes.

**Architecture:** A small AST module (`web/lib/ast/`) handles parsing formula text into an `Expr` tree, pretty-printing it back, rendering a tree preview, and round-tripping to the backend's JSON shape. The UI is three composed components: `FormulaEditor` (one formula), `SchemaFieldRow` (one row of the field table) and the rewritten `SchemaBuilder` (orchestrator). All formula-related code is pure and TDD-driven; UI components have behavior tests for the critical interactions.

**Tech Stack:** Next.js 15, React 19, TypeScript, react-hook-form (only at the SchemaBuilder level), vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-05-15-visual-schema-builder-design.md`

---

## File map

```
web/lib/ast/types.ts                              Expr discriminated union
web/lib/ast/parseFormula.ts                       text -> Expr
web/lib/ast/printFormula.ts                       Expr -> text
web/lib/ast/serialize.ts                          Expr <-> backend JSON
web/lib/ast/treePreview.ts                        Expr -> ASCII tree

web/lib/api/types.ts                              FieldType += "string"
web/lib/schemas/validationSchema.ts               drop builderSchema (no replacement; SchemaBuilder uses local state)

web/components/forms/FormulaEditor.tsx            new
web/components/forms/SchemaFieldRow.tsx           new
web/components/forms/SchemaBuilder.tsx            rewrite (tabular + raw JSON disclosure)

web/test/ast/parseFormula.test.ts                 parser drives 1+2+5+6 below
web/test/ast/printFormula.test.ts                 printer drives round-trip
web/test/ast/serialize.test.ts                    encode/decode parity
web/test/components/FormulaEditor.test.tsx        component
web/test/components/SchemaFieldRow.test.tsx       component
```

---

## Task 1: AST types + parser (TDD)

**Files:**
- Create: `web/lib/ast/types.ts`
- Create: `web/lib/ast/parseFormula.ts`
- Create: `web/test/ast/parseFormula.test.ts`

This is the keystone of the spec. The parser must accept exactly the surface DSL (numbers, identifiers, `+ - * /`, parens, unary minus) and produce the AST shape the rest of the module expects. We drive it with a focused test suite that covers each grammar rule and the error cases.

- [ ] **Step 1: Create `web/lib/ast/types.ts`**

```ts
export type BinOp = "add" | "sub" | "mul" | "div";

export type Expr =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string }
  | { kind: "binop"; op: BinOp; left: Expr; right: Expr };

export type ParseResult =
  | { ok: true; expr: Expr }
  | { ok: false; error: { pos: number; message: string } };
```

- [ ] **Step 2: Write the failing parser tests `web/test/ast/parseFormula.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { parseFormula } from "@/lib/ast/parseFormula";
import type { Expr } from "@/lib/ast/types";

function expect_ok(text: string): Expr {
  const r = parseFormula(text);
  if (!r.ok) throw new Error(`expected ok for "${text}", got ${r.error.message}`);
  return r.expr;
}

describe("parseFormula - literals", () => {
  it("parses integer literals", () => {
    expect(expect_ok("42")).toEqual({ kind: "num", value: 42 });
  });
  it("parses decimal literals", () => {
    expect(expect_ok("0.5")).toEqual({ kind: "num", value: 0.5 });
  });
  it("parses identifiers", () => {
    expect(expect_ok("temperature")).toEqual({
      kind: "var",
      name: "temperature",
    });
  });
  it("accepts snake_case identifiers", () => {
    expect(expect_ok("humid_idx_2")).toEqual({
      kind: "var",
      name: "humid_idx_2",
    });
  });
});

describe("parseFormula - binops", () => {
  it("parses addition", () => {
    expect(expect_ok("1 + 2")).toEqual({
      kind: "binop",
      op: "add",
      left: { kind: "num", value: 1 },
      right: { kind: "num", value: 2 },
    });
  });
  it("parses all four operators", () => {
    for (const [op, sym] of [
      ["add", "+"],
      ["sub", "-"],
      ["mul", "*"],
      ["div", "/"],
    ] as const) {
      const r = parseFormula(`a ${sym} b`);
      if (!r.ok) throw new Error(r.error.message);
      expect(r.expr).toEqual({
        kind: "binop",
        op,
        left: { kind: "var", name: "a" },
        right: { kind: "var", name: "b" },
      });
    }
  });
});

describe("parseFormula - precedence and associativity", () => {
  it("multiplies before adding", () => {
    expect(expect_ok("1 + 2 * 3")).toEqual({
      kind: "binop",
      op: "add",
      left: { kind: "num", value: 1 },
      right: {
        kind: "binop",
        op: "mul",
        left: { kind: "num", value: 2 },
        right: { kind: "num", value: 3 },
      },
    });
  });
  it("is left-associative for subtraction", () => {
    expect(expect_ok("1 - 2 - 3")).toEqual({
      kind: "binop",
      op: "sub",
      left: {
        kind: "binop",
        op: "sub",
        left: { kind: "num", value: 1 },
        right: { kind: "num", value: 2 },
      },
      right: { kind: "num", value: 3 },
    });
  });
  it("respects parentheses", () => {
    expect(expect_ok("(1 + 2) * 3")).toEqual({
      kind: "binop",
      op: "mul",
      left: {
        kind: "binop",
        op: "add",
        left: { kind: "num", value: 1 },
        right: { kind: "num", value: 2 },
      },
      right: { kind: "num", value: 3 },
    });
  });
});

describe("parseFormula - unary minus", () => {
  it("desugars -x to (0 - x)", () => {
    expect(expect_ok("-x")).toEqual({
      kind: "binop",
      op: "sub",
      left: { kind: "num", value: 0 },
      right: { kind: "var", name: "x" },
    });
  });
  it("handles -(a + b)", () => {
    expect(expect_ok("-(a + b)")).toEqual({
      kind: "binop",
      op: "sub",
      left: { kind: "num", value: 0 },
      right: {
        kind: "binop",
        op: "add",
        left: { kind: "var", name: "a" },
        right: { kind: "var", name: "b" },
      },
    });
  });
});

describe("parseFormula - errors", () => {
  it("rejects empty input", () => {
    const r = parseFormula("");
    expect(r.ok).toBe(false);
  });
  it("rejects trailing operator", () => {
    const r = parseFormula("1 +");
    expect(r.ok).toBe(false);
  });
  it("rejects unbalanced parens", () => {
    const r = parseFormula("(1 + 2");
    expect(r.ok).toBe(false);
  });
  it("rejects identifier with leading digit", () => {
    const r = parseFormula("1abc");
    expect(r.ok).toBe(false);
  });
  it("rejects unexpected character", () => {
    const r = parseFormula("a & b");
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests (expect failures)**

```bash
cd web && pnpm test test/ast/parseFormula.test.ts
```

Expected: import fails (`parseFormula` does not exist).

- [ ] **Step 4: Implement `web/lib/ast/parseFormula.ts`**

```ts
import type { BinOp, Expr, ParseResult } from "./types";

type Token =
  | { kind: "num"; value: number; pos: number }
  | { kind: "ident"; name: string; pos: number }
  | { kind: "op"; op: "+" | "-" | "*" | "/"; pos: number }
  | { kind: "lparen"; pos: number }
  | { kind: "rparen"; pos: number };

function tokenize(text: string): Token[] | { error: { pos: number; message: string } } {
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

  function parseExpr(minPrec: number): Expr {
    let left = parseUnary();
    while (true) {
      const t = peek();
      if (!t || t.kind !== "op" || t.op === "+") {
        // fall through if + handled below
      }
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

  function makeError(p: number, message: string): Error & {
    parserError: { pos: number; message: string };
  } {
    const err = new Error(message) as Error & {
      parserError: { pos: number; message: string };
    };
    err.parserError = { pos: p, message };
    return err;
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
        error: (e as { parserError: { pos: number; message: string } }).parserError,
      };
    }
    throw e;
  }
}
```

- [ ] **Step 5: Run the tests (expect pass)**

```bash
cd web && pnpm test test/ast/parseFormula.test.ts
```

Expected: all green. If any case fails, fix the parser, not the test.

- [ ] **Step 6: Commit**

```bash
git add web/lib/ast/types.ts web/lib/ast/parseFormula.ts web/test/ast/parseFormula.test.ts
git commit -m "feat(web): AST types and recursive-descent formula parser

parseFormula(text) -> Expr. Grammar covers numbers, identifiers,
+ - * / with standard precedence, parentheses, and unary minus
(desugared to 0 - x). Returns positioned errors on the failure case."
```

---

## Task 2: Printer (TDD)

**Files:**
- Create: `web/lib/ast/printFormula.ts`
- Create: `web/test/ast/printFormula.test.ts`

The printer must produce text that round-trips through the parser. We test that property directly.

- [ ] **Step 1: Write the failing tests**

`web/test/ast/printFormula.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseFormula } from "@/lib/ast/parseFormula";
import { printFormula } from "@/lib/ast/printFormula";
import type { Expr } from "@/lib/ast/types";

function roundtrip(text: string): Expr {
  const r = parseFormula(text);
  if (!r.ok) throw new Error(r.error.message);
  return r.expr;
}

describe("printFormula round-trip", () => {
  const cases = [
    "1",
    "0.5",
    "temperature",
    "a + b",
    "a - b - c",
    "1 + 2 * 3",
    "(1 + 2) * 3",
    "(a + b) * (c - d)",
    "(temperature - 32) * 0.5",
  ];
  for (const text of cases) {
    it(`round-trips: ${text}`, () => {
      const expr = roundtrip(text);
      const printed = printFormula(expr);
      const reparsed = roundtrip(printed);
      expect(reparsed).toEqual(expr);
    });
  }
});

describe("printFormula - parenthesization", () => {
  it("omits redundant parens for left-associative ops", () => {
    const expr = roundtrip("a - b - c");
    expect(printFormula(expr)).toBe("a - b - c");
  });
  it("inserts parens when needed by precedence", () => {
    const expr = roundtrip("(1 + 2) * 3");
    expect(printFormula(expr)).toBe("(1 + 2) * 3");
  });
});
```

- [ ] **Step 2: Run (expect failure)**

```bash
cd web && pnpm test test/ast/printFormula.test.ts
```

- [ ] **Step 3: Implement `web/lib/ast/printFormula.ts`**

```ts
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
  // Right-associate? Our ops are left-assoc, so the right child of a same-prec
  // operator needs parens to preserve grouping. The left child does not.
  const leftText = printAt(expr.left, prec, false);
  const rightText = printAt(expr.right, prec, true);
  const inner = `${leftText} ${SYM[expr.op]} ${rightText}`;
  const needsParens = prec < parentPrec || (prec === parentPrec && isRightChild);
  return needsParens ? `(${inner})` : inner;
}

export function printFormula(expr: Expr): string {
  return printAt(expr, 0, false);
}
```

- [ ] **Step 4: Run (expect pass)**

```bash
cd web && pnpm test test/ast/printFormula.test.ts
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add web/lib/ast/printFormula.ts web/test/ast/printFormula.test.ts
git commit -m "feat(web): printFormula pretty-prints an Expr back to text

Round-trips through parseFormula. Omits redundant parens for the
left associative case; inserts them only where precedence or
right-child grouping requires them."
```

---

## Task 3: Serialize (Expr <-> backend JSON) and treePreview (TDD)

**Files:**
- Create: `web/lib/ast/serialize.ts`
- Create: `web/lib/ast/treePreview.ts`
- Create: `web/test/ast/serialize.test.ts`

The Rust backend serializes `Expr` with `serde(tag = "type", rename_all = "snake_case")` and the `Op` enum unrenamed (`Add | Sub | Mul | Div`). So:

- `{ kind: "num", value: 3 }`  ↔  `{ type: "num", value: 3 }`
- `{ kind: "var", name: "x" }` ↔  `{ type: "var", name: "x" }`
- `{ kind: "binop", op: "add", left, right }` ↔ `{ type: "bin_op", op: "Add", left, right }`

We test the round-trip and the rejection of malformed input.

- [ ] **Step 1: Write the failing serialize tests**

`web/test/ast/serialize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fromBackend, toBackend } from "@/lib/ast/serialize";
import type { Expr } from "@/lib/ast/types";

const sampleExpr: Expr = {
  kind: "binop",
  op: "mul",
  left: {
    kind: "binop",
    op: "sub",
    left: { kind: "var", name: "temperature" },
    right: { kind: "num", value: 32 },
  },
  right: { kind: "num", value: 0.5 },
};

const sampleJson = {
  type: "bin_op",
  op: "Mul",
  left: {
    type: "bin_op",
    op: "Sub",
    left: { type: "var", name: "temperature" },
    right: { type: "num", value: 32 },
  },
  right: { type: "num", value: 0.5 },
};

describe("serialize - toBackend / fromBackend", () => {
  it("encodes Expr to the backend shape", () => {
    expect(toBackend(sampleExpr)).toEqual(sampleJson);
  });
  it("decodes backend shape to Expr", () => {
    expect(fromBackend(sampleJson)).toEqual(sampleExpr);
  });
  it("round-trips", () => {
    expect(fromBackend(toBackend(sampleExpr))).toEqual(sampleExpr);
  });
});

describe("fromBackend - malformed", () => {
  it("returns null when missing type", () => {
    expect(fromBackend({ value: 1 })).toBeNull();
  });
  it("returns null on unknown discriminator", () => {
    expect(fromBackend({ type: "weird" })).toBeNull();
  });
  it("returns null on invalid op", () => {
    expect(
      fromBackend({
        type: "bin_op",
        op: "Pow",
        left: { type: "num", value: 1 },
        right: { type: "num", value: 2 },
      }),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run (expect failure)**

```bash
cd web && pnpm test test/ast/serialize.test.ts
```

- [ ] **Step 3: Implement `web/lib/ast/serialize.ts`**

```ts
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
```

- [ ] **Step 4: Implement `web/lib/ast/treePreview.ts` (no tests — pure visual; covered by visual inspection in the FormulaEditor test)**

```ts
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
```

- [ ] **Step 5: Run (expect pass)**

```bash
cd web && pnpm test test/ast/serialize.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add web/lib/ast/serialize.ts web/lib/ast/treePreview.ts web/test/ast/serialize.test.ts
git commit -m "feat(web): serialize Expr to/from backend JSON and ASCII tree preview

serialize.ts bridges the frontend Expr to the Rust serde shape
(snake_case discriminator, capitalized op). treePreview renders a
multi-line ASCII tree used by FormulaEditor for live confirmation."
```

---

## Task 4: Extend `FieldType` and drop the JSON-only zod schema

**Files:**
- Modify: `web/lib/api/types.ts`
- Modify: `web/lib/schemas/validationSchema.ts`

The backend `FieldType` enum already includes `String` (`crates/domain/src/ast/schemas.rs:33`); the frontend's matching type union was missing it. We also drop `builderSchema` from the zod helpers because the new SchemaBuilder manages its own controlled state instead of going through a single textarea.

- [ ] **Step 1: Extend `FieldType` in `web/lib/api/types.ts`**

Find the line (currently line 111):

```ts
export type FieldType = "float" | "int" | "bool";
```

Replace with:

```ts
export type FieldType = "float" | "int" | "bool" | "string";
```

- [ ] **Step 2: Replace `web/lib/schemas/validationSchema.ts`**

```ts
import { z } from "zod";

export const fieldNameSchema = z
  .string()
  .min(1, "field name is required")
  .regex(
    /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    "use letters, digits and underscores; start with a letter or _",
  );

export const schemaNameSchema = z
  .string()
  .min(1, "name is required")
  .max(32, "max 32 characters");
```

This file is now a tiny set of reusable validators. `SchemaBuilder` and `SchemaFieldRow` import them directly.

- [ ] **Step 3: Typecheck**

```bash
cd web && pnpm typecheck
```

Expected: many errors about `builderSchema` and `BuilderInput` not being exported anymore from `validationSchema.ts`. The old `SchemaBuilder.tsx` references them. We accept that — Task 7 will rewrite that file. To keep CI green between tasks, perform Tasks 5 → 7 in order; do not commit Task 4 alone if the workspace needs to typecheck mid-way. **Combine the Task 4 commit with Task 7**, or proceed to Task 7 immediately after Task 4. The commit at the end of Task 7 covers both.

(Tests do not import these symbols, so `pnpm test` may stay green even though typecheck temporarily fails.)

---

## Task 5: `FormulaEditor` component (TDD)

**Files:**
- Create: `web/components/forms/FormulaEditor.tsx`
- Create: `web/test/components/FormulaEditor.test.tsx`

`FormulaEditor` owns the single-line formula text input and the parsed-state feedback below it.

- [ ] **Step 1: Write the failing tests**

`web/test/components/FormulaEditor.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FormulaEditor } from "@/components/forms/FormulaEditor";

describe("FormulaEditor", () => {
  it("renders the current value and a valid badge for a parseable formula", () => {
    render(
      <FormulaEditor
        fieldName="tempC"
        availableVariables={["temperature"]}
        value="(temperature - 32) * 0.5"
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("(temperature - 32) * 0.5");
    expect(screen.getByText(/valid/i)).toBeInTheDocument();
  });

  it("shows an error message when the formula is unparseable", () => {
    render(
      <FormulaEditor
        fieldName="tempC"
        availableVariables={[]}
        value="(temperature - 32) *"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/unexpected end/i)).toBeInTheDocument();
  });

  it("calls onChange when the user types", () => {
    const onChange = vi.fn();
    render(
      <FormulaEditor
        fieldName="tempC"
        availableVariables={["temperature"]}
        value=""
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "temperature * 0.1" },
    });
    expect(onChange).toHaveBeenCalledWith("temperature * 0.1");
  });

  it("treats empty input as valid (means: no transformation)", () => {
    render(
      <FormulaEditor
        fieldName="tempC"
        availableVariables={[]}
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText(/error|unexpected/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run (expect failure)**

```bash
cd web && pnpm test test/components/FormulaEditor.test.tsx
```

- [ ] **Step 3: Implement `web/components/forms/FormulaEditor.tsx`**

```tsx
"use client";
import { useMemo } from "react";
import { Input } from "@/components/ui/Input";
import { parseFormula } from "@/lib/ast/parseFormula";
import { treePreview } from "@/lib/ast/treePreview";

interface Props {
  fieldName: string;
  availableVariables: string[];
  value: string;
  onChange: (text: string) => void;
}

export function FormulaEditor({
  fieldName,
  availableVariables,
  value,
  onChange,
}: Props) {
  const parsed = useMemo(() => {
    if (value.trim() === "") return { ok: true as const, expr: null };
    const r = parseFormula(value);
    return r;
  }, [value]);

  const tree = useMemo(() => {
    if (parsed.ok && parsed.expr) return treePreview(parsed.expr);
    return null;
  }, [parsed]);

  return (
    <div className="border border-[#2a2a2a] rounded-[2px] p-3 bg-[var(--color-bg-panel)]">
      <div className="t-label mb-1">{`// formula for ${fieldName}`}</div>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. (temperature - 32) * 0.5"
        autoComplete="off"
      />
      <div className="mt-2 text-[11px] font-mono">
        {parsed.ok ? (
          value.trim() === "" ? (
            <span className="text-[var(--color-fg-3)]">
              // empty = no transformation
            </span>
          ) : (
            <span className="text-[var(--color-accent)]">[✓ valid]</span>
          )
        ) : (
          <span className="text-[var(--color-danger)]">
            × col {parsed.error.pos + 1}: {parsed.error.message}
          </span>
        )}
      </div>
      {availableVariables.length > 0 && (
        <div className="mt-2 text-[11px] text-[var(--color-fg-3)] font-mono">
          available: {availableVariables.join(", ")}
        </div>
      )}
      {tree && (
        <pre className="mt-3 text-[11px] text-[var(--color-fg-2)] font-mono whitespace-pre">
{tree}
        </pre>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run (expect pass)**

```bash
cd web && pnpm test test/components/FormulaEditor.test.tsx
```

- [ ] **Step 5: Commit (alone — this file does not depend on Tasks 4/6/7)**

```bash
git add web/components/forms/FormulaEditor.tsx web/test/components/FormulaEditor.test.tsx
git commit -m "feat(web): FormulaEditor with live parse feedback and tree preview

Single-line input bound to parseFormula. Shows [✓ valid] when parsed,
positioned error otherwise. Empty input is treated as 'no
transformation'. Lists available variables and renders an ASCII tree
of the parsed Expr for confidence."
```

---

## Task 6: `SchemaFieldRow` component (TDD)

**Files:**
- Create: `web/components/forms/SchemaFieldRow.tsx`
- Create: `web/test/components/SchemaFieldRow.test.tsx`

One row of the field editor. Owns its UI state for the per-row controls and surfaces changes through a single `onChange(row)` callback.

- [ ] **Step 1: Define the row shape (inside the component file is fine, but exported)**

The exported type:

```ts
export interface FieldRow {
  name: string;
  type: "float" | "int" | "bool" | "string";
  required: boolean;
  defaultValue: string;     // user input — coerced on submit at the SchemaBuilder level
  min: string;
  max: string;
  formula: string;          // raw formula text; empty = no operation
}
```

- [ ] **Step 2: Write the failing tests**

`web/test/components/SchemaFieldRow.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  SchemaFieldRow,
  type FieldRow,
} from "@/components/forms/SchemaFieldRow";

const baseRow: FieldRow = {
  name: "temperature",
  type: "float",
  required: true,
  defaultValue: "",
  min: "-40",
  max: "85",
  formula: "",
};

describe("SchemaFieldRow", () => {
  it("renders the current values", () => {
    render(
      <SchemaFieldRow
        row={baseRow}
        availableVariables={[]}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe(
      "temperature",
    );
    expect((screen.getByLabelText(/min/i) as HTMLInputElement).value).toBe(
      "-40",
    );
  });

  it("calls onChange when the user edits a field", () => {
    const onChange = vi.fn();
    render(
      <SchemaFieldRow
        row={baseRow}
        availableVariables={[]}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "temp" },
    });
    expect(onChange).toHaveBeenCalledWith({ ...baseRow, name: "temp" });
  });

  it("disables min/max/formula when type is bool", () => {
    render(
      <SchemaFieldRow
        row={{ ...baseRow, type: "bool" }}
        availableVariables={[]}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/min/i)).toBeDisabled();
    expect(screen.getByLabelText(/max/i)).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /formula/i }),
    ).toBeDisabled();
  });

  it("calls onRemove when the delete button is clicked", () => {
    const onRemove = vi.fn();
    render(
      <SchemaFieldRow
        row={baseRow}
        availableVariables={[]}
        onChange={vi.fn()}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /remove field/i }));
    expect(onRemove).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run (expect failure)**

```bash
cd web && pnpm test test/components/SchemaFieldRow.test.tsx
```

- [ ] **Step 4: Implement `web/components/forms/SchemaFieldRow.tsx`**

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormulaEditor } from "./FormulaEditor";

export type FieldType = "float" | "int" | "bool" | "string";

export interface FieldRow {
  name: string;
  type: FieldType;
  required: boolean;
  defaultValue: string;
  min: string;
  max: string;
  formula: string;
}

interface Props {
  row: FieldRow;
  availableVariables: string[];
  onChange: (row: FieldRow) => void;
  onRemove: () => void;
}

function isNumeric(t: FieldType): boolean {
  return t === "float" || t === "int";
}

export function SchemaFieldRow({
  row,
  availableVariables,
  onChange,
  onRemove,
}: Props) {
  const [formulaOpen, setFormulaOpen] = useState(false);
  const numeric = isNumeric(row.type);

  function patch(p: Partial<FieldRow>) {
    onChange({ ...row, ...p });
  }

  function handleTypeChange(t: FieldType) {
    const next: FieldRow = { ...row, type: t };
    if (!isNumeric(t)) {
      next.min = "";
      next.max = "";
      next.formula = "";
    }
    onChange(next);
  }

  return (
    <div className="border border-[#2a2a2a] rounded-[2px] p-3 bg-[var(--color-bg-panel)] mb-2">
      <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_auto_1fr_1fr_1fr_auto_auto] gap-2 items-center">
        <label className="flex flex-col">
          <span className="t-label">{"// "}NAME</span>
          <Input
            aria-label="name"
            value={row.name}
            onChange={(e) => patch({ name: e.target.value })}
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col">
          <span className="t-label">{"// "}TYPE</span>
          <Select
            aria-label="type"
            value={row.type}
            onChange={(e) => handleTypeChange(e.target.value as FieldType)}
          >
            <option value="float">float</option>
            <option value="int">int</option>
            <option value="bool">bool</option>
            <option value="string">string</option>
          </Select>
        </label>
        <label className="flex flex-col items-center">
          <span className="t-label">{"// "}REQ</span>
          <input
            type="checkbox"
            aria-label="required"
            checked={row.required}
            onChange={(e) => patch({ required: e.target.checked })}
          />
        </label>
        <label className="flex flex-col">
          <span className="t-label">{"// "}DEFAULT</span>
          <Input
            aria-label="default"
            value={row.defaultValue}
            onChange={(e) => patch({ defaultValue: e.target.value })}
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col">
          <span className="t-label">{"// "}MIN</span>
          <Input
            aria-label="min"
            value={row.min}
            disabled={!numeric}
            onChange={(e) => patch({ min: e.target.value })}
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col">
          <span className="t-label">{"// "}MAX</span>
          <Input
            aria-label="max"
            value={row.max}
            disabled={!numeric}
            onChange={(e) => patch({ max: e.target.value })}
            autoComplete="off"
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setFormulaOpen((v) => !v)}
          disabled={!numeric}
        >
          {row.formula ? "formula ✓" : "formula"}
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={onRemove}
          aria-label="remove field"
        >
          ×
        </Button>
      </div>
      {formulaOpen && numeric && (
        <div className="mt-3">
          <FormulaEditor
            fieldName={row.name || "(unnamed)"}
            availableVariables={availableVariables}
            value={row.formula}
            onChange={(text) => patch({ formula: text })}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run (expect pass)**

```bash
cd web && pnpm test test/components/SchemaFieldRow.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add web/components/forms/SchemaFieldRow.tsx web/test/components/SchemaFieldRow.test.tsx
git commit -m "feat(web): SchemaFieldRow with inline FormulaEditor disclosure

Per-field row exposing name/type/required/default/min/max plus a
formula toggle that opens the FormulaEditor inline. Min/max/formula
disable automatically for non-numeric types."
```

---

## Task 7: Rewrite `SchemaBuilder`

**Files:**
- Modify: `web/components/forms/SchemaBuilder.tsx`

The builder owns the array of `FieldRow`s and the schema name, hydrates from `defaultSchema` if present, and serializes back to `SchemaMap` on submit. The raw-JSON `<details>` shows the live serialized output read-only.

- [ ] **Step 1: Replace `web/components/forms/SchemaBuilder.tsx` with the new implementation**

```tsx
"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import {
  SchemaFieldRow,
  type FieldRow,
  type FieldType,
} from "./SchemaFieldRow";
import type { FieldSchema, SchemaMap } from "@/lib/api/types";
import { parseFormula } from "@/lib/ast/parseFormula";
import { printFormula } from "@/lib/ast/printFormula";
import { fromBackend, toBackend } from "@/lib/ast/serialize";
import {
  fieldNameSchema,
  schemaNameSchema,
} from "@/lib/schemas/validationSchema";

interface SubmitPayload {
  name: string;
  schema: SchemaMap;
}

interface Props {
  defaultName?: string;
  defaultSchema?: SchemaMap;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (payload: SubmitPayload) => Promise<void> | void;
}

let nextRowId = 1;
function makeRowId() {
  return nextRowId++;
}

interface RowWithId extends FieldRow {
  _rid: number;
}

function rowFromField(name: string, f: FieldSchema): RowWithId {
  const opExpr = f.operation ? fromBackend(f.operation) : null;
  return {
    _rid: makeRowId(),
    name,
    type: f.type,
    required: f.required ?? false,
    defaultValue:
      f.default === null || f.default === undefined ? "" : String(f.default),
    min:
      f.validation?.min === null || f.validation?.min === undefined
        ? ""
        : String(f.validation.min),
    max:
      f.validation?.max === null || f.validation?.max === undefined
        ? ""
        : String(f.validation.max),
    formula: opExpr ? printFormula(opExpr) : "",
  };
}

function emptyRow(type: FieldType = "float"): RowWithId {
  return {
    _rid: makeRowId(),
    name: "",
    type,
    required: true,
    defaultValue: "",
    min: "",
    max: "",
    formula: "",
  };
}

function parseDefault(type: FieldType, raw: string): number | boolean | string | null {
  if (raw === "") return null;
  if (type === "bool") return raw === "true";
  if (type === "string") return raw;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  return n;
}

function parseNumOrUndef(raw: string): number | undefined {
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

interface SerializeResult {
  ok: true;
  schema: SchemaMap;
} | {
  ok: false;
  errors: string[];
};

function serializeRows(rows: RowWithId[]): SerializeResult {
  const errors: string[] = [];
  const out: SchemaMap = {};
  const seen = new Set<string>();
  for (const r of rows) {
    const nameCheck = fieldNameSchema.safeParse(r.name);
    if (!nameCheck.success) {
      errors.push(`"${r.name || "(unnamed)"}": ${nameCheck.error.issues[0].message}`);
      continue;
    }
    if (seen.has(r.name)) {
      errors.push(`duplicate field name "${r.name}"`);
      continue;
    }
    seen.add(r.name);

    let operation: Record<string, unknown> | null = null;
    if (r.formula.trim() !== "") {
      const p = parseFormula(r.formula);
      if (!p.ok) {
        errors.push(
          `"${r.name}": formula error at col ${p.error.pos + 1}: ${p.error.message}`,
        );
        continue;
      }
      operation = toBackend(p.expr) as Record<string, unknown>;
    }

    const min = parseNumOrUndef(r.min);
    const max = parseNumOrUndef(r.max);
    const validation =
      min !== undefined || max !== undefined
        ? { min: min ?? null, max: max ?? null }
        : null;

    const field: FieldSchema = {
      type: r.type,
      required: r.required,
      default: parseDefault(r.type, r.defaultValue),
      validation,
      operation,
    };
    out[r.name] = field;
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, schema: out };
}

export function SchemaBuilder({
  defaultName,
  defaultSchema,
  submitLabel,
  submitting,
  onSubmit,
}: Props) {
  const [name, setName] = useState(defaultName ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [rows, setRows] = useState<RowWithId[]>(() => {
    if (defaultSchema && Object.keys(defaultSchema).length > 0) {
      return Object.entries(defaultSchema).map(([n, f]) => rowFromField(n, f));
    }
    return [emptyRow()];
  });
  const [serializeErrors, setSerializeErrors] = useState<string[]>([]);

  const availableVariables = useMemo(
    () => rows.map((r) => r.name).filter((n) => n.length > 0),
    [rows],
  );

  const currentSerialized = useMemo(() => serializeRows(rows), [rows]);

  async function handleSubmit() {
    const nameCheck = schemaNameSchema.safeParse(name);
    if (!nameCheck.success) {
      setNameError(nameCheck.error.issues[0].message);
      return;
    }
    setNameError(null);

    if (!currentSerialized.ok) {
      setSerializeErrors(currentSerialized.errors);
      return;
    }
    setSerializeErrors([]);
    await onSubmit({ name, schema: currentSerialized.schema });
  }

  return (
    <div className="max-w-[1100px]">
      <FormField label="SCHEMA NAME" error={nameError ?? undefined}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. weather"
          autoComplete="off"
        />
      </FormField>

      <h2 className="t-section mt-6 mb-3">{"// "}fields</h2>
      {rows.map((row, idx) => (
        <SchemaFieldRow
          key={row._rid}
          row={row}
          availableVariables={availableVariables.filter(
            (n) => n !== row.name,
          )}
          onChange={(updated) =>
            setRows((rs) => rs.map((r, i) => (i === idx ? { ...updated, _rid: r._rid } : r)))
          }
          onRemove={() =>
            setRows((rs) => (rs.length > 1 ? rs.filter((_, i) => i !== idx) : rs))
          }
        />
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setRows((rs) => [...rs, emptyRow()])}
      >
        + add field
      </Button>

      {serializeErrors.length > 0 && (
        <div className="mt-4 border border-[var(--color-danger)] p-3 rounded-[2px] text-[12px] font-mono text-[var(--color-danger)]">
          {serializeErrors.map((e, i) => (
            <div key={i}>× {e}</div>
          ))}
        </div>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-[12px] font-mono text-[var(--color-fg-3)]">
          ▸ show raw JSON
        </summary>
        <pre className="mt-2 text-[11px] font-mono text-[var(--color-fg-2)] whitespace-pre overflow-x-auto p-3 border border-[#2a2a2a] rounded-[2px] bg-[var(--color-bg-panel)]">
{currentSerialized.ok
  ? JSON.stringify(currentSerialized.schema, null, 2)
  : "// schema currently has errors — fix them above"}
        </pre>
      </details>

      <div className="flex gap-3 items-center mt-6">
        <Button
          type="button"
          variant="primary"
          onClick={handleSubmit}
          disabled={submitting || !currentSerialized.ok}
        >
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => history.back()}
        >
          cancel
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd web && pnpm typecheck
```

Expected: clean. The old `builderSchema` and `BuilderInput` imports are gone; nothing else referenced them outside the (now-rewritten) `SchemaBuilder`.

- [ ] **Step 3: Run the full test suite**

```bash
cd web && pnpm test
```

Expected: all green (no test in the suite imports the deleted `builderSchema`).

- [ ] **Step 4: Lint**

```bash
cd web && pnpm lint
```

Expected: clean.

- [ ] **Step 5: Manual verification**

Start the dev server (`pnpm dev`) with the backend running.

1. Go to `/schemas/new`. Set the name to `weather`. Add three fields:
   - `temperature_raw`: float, required, min `-50`, max `150`, no formula.
   - `temperature_c`: float, required, formula `(temperature_raw - 32) * 0.5` → see `[✓ valid]` and the ASCII tree.
   - `device_name`: string, required, no min/max/formula (controls disabled).
2. Expand `▸ show raw JSON` — confirm the JSON shape matches the backend's expectation (operation node has `type: "bin_op"`, op `"Sub"`/`"Mul"`).
3. Submit. Toast green; redirect to `/schemas`.
4. Open `/schemas/<id>`. All three rows hydrate. The formula reads back round-tripped.
5. Edit `temperature_c` formula to invalid (`temperature_raw - 32 *`). Save button disables; error block lists the row + column.

- [ ] **Step 6: Commit the SchemaBuilder rewrite + Task 4 type changes together**

```bash
git add web/components/forms/SchemaBuilder.tsx \
        web/lib/api/types.ts \
        web/lib/schemas/validationSchema.ts
git commit -m "feat(web): rewrite SchemaBuilder as a tabular field editor

Drops the JSON textarea in favor of a visual builder: one row per
field, FormulaEditor inline for transformations, and a collapsed
read-only raw-JSON disclosure. Extends FieldType with 'string' to
match the backend. Existing schemas hydrate cleanly because the AST
serializer round-trips through fromBackend / printFormula."
```

---

## Final verification

- [ ] **Step 1: Full suite green**

```bash
cd web && pnpm test && pnpm typecheck && pnpm lint
```

Expected: all green.

- [ ] **Step 2: End-to-end manual smoke**

With the backend running:

1. Create the `weather` schema described in Task 7 Step 5.
2. Edit it: change the formula on `temperature_c`. The new formula must round-trip after save.
3. Build a pipeline using this schema, start it, and feed it a record. Confirm transformation happens (Influx receives the converted Celsius). This step ties all three specs together and is the final acceptance.

- [ ] **Step 3: Push when ready**

```bash
git push
```

(Only run with explicit user authorization.)
