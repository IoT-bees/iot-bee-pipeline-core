---
name: visual-schema-builder
description: Spec C — replace the JSON textarea schema builder with a visual tabular editor and an Excel-like formula editor for per-field transformations. Hide JSON and AST from the user.
status: draft
date: 2026-05-15
related:
  - 2026-05-15-frontend-bug-fixes-design (Spec A)
  - 2026-05-15-status-colors-and-pipeline-edit-design (Spec B)
---

# Spec C — Visual schema + AST builder

## Goal

Today, defining a validation schema requires writing a JSON map by hand, and each field's `operation` field requires authoring a nested AST literal (`{ "type": "bin_op", "op": "Mul", "left": {...}, "right": {...} }`). That is a non-starter for any non-engineer who would have to read internal AST/VM docs first. The product needs to be sellable to a client who configures their own ingestion without reading the codebase.

This spec replaces the JSON textarea with a tabular field editor and an Excel-style formula editor. The user never sees the word "JSON", "AST", or "operation" — they see "fields", "rules", and "formulas".

## Non-goals

- Comparison operators (`>`, `<`, `==`), built-in functions (`abs`, `min`, `max`), or boolean operators in formulas. The backend AST has none of these, so we constrain the DSL to what compiles.
- Drag-to-reorder rows. The schema is a `HashMap` server-side; field order has no semantic meaning.
- Multi-output transformations (one input → multiple stored fields). Out of scope of the existing model.
- Migrating existing schemas. The shape on disk is unchanged; the new builder just renders it.

## Vocabulary

| Surface (what the user sees) | Internal (what the backend stores) |
|---|---|
| Field | Key in `SchemaMap` |
| Type | `FieldType` (`float`, `int`, `bool`, `string`) |
| Required | `required: bool` |
| Default | `default: Value` |
| Min / Max | `validation.min`, `validation.max` |
| Formula | `operation: Expr` (the AST) |
| Variables in formula | `Expr::Var { name }` references |

"AST", "Expr", "Operation", "JSON" do not appear in any visible label.

## Component layout

### `web/components/forms/SchemaBuilder.tsx` (rewrite)

The textarea + JSON preview is replaced by:

```
schema name:  [_____________________]

FIELDS

  name              type       required   default     min     max     formula           [×]
  temperature       [float ▾]   [✓]        ___         -40      85    [(raw - 32)*0.5]   [×]
  humidity          [float ▾]   [✓]        ___           0     100    [—]                [×]
  active            [bool ▾]    [ ]        true        —       —      [—]                [×]

  [+ add field]

  [▸ show raw JSON]

  [ CREATE SCHEMA ]  [cancel]
```

Holds the top-level form state (schema name + array of field rows). Submit serializes the visual state to the same `SchemaMap` shape the backend already expects.

### `web/components/forms/SchemaFieldRow.tsx` (new)

Renders one row. Controls:

- `name`: text input. Disallowed characters validated (must match `[a-zA-Z_][a-zA-Z0-9_]*`, since the same string ends up as a JSON key and as a variable name in other fields' formulas).
- `type`: `<Select>` with `float | int | bool | string`.
- `required`: checkbox.
- `default`: input whose accepted format follows `type`:
  - `float` / `int` → numeric input
  - `bool` → segmented toggle (`true` / `false` / `—`)
  - `string` → text input
- `min` / `max`: numeric inputs, both optional, enabled only for `float` and `int`.
- `formula`: a button labeled `[—]` if empty, otherwise a one-line preview of the parsed formula. Click opens `FormulaEditor` inline below the row. Available only when `type` is numeric.
- `[×]`: remove this row.

When the row's `type` is `bool` or `string`, `min` / `max` / `formula` are visually muted and disabled. Switching `type` to one that no longer supports them clears their values.

### `web/components/forms/FormulaEditor.tsx` (new)

Renders the formula editor for one field. Props:

```ts
{
  fieldName: string;
  availableVariables: string[];   // other field names, for hints
  value: string;                  // formula text
  onChange: (text: string) => void;
}
```

Layout:

```
formula:  (temperature - 32) * 0.5
                                                       [✓ valid]
variables in this formula: temperature
available: humidity, active     ← click to insert at cursor

preview:
  *
  ├─ -
  │  ├─ temperature
  │  └─ 32
  └─ 0.5
```

- Live parse on every keystroke (debounced 100 ms).
- Green tick when parses; tree preview rendered below.
- Red error when parse fails, with the position highlighted (`column N: expected ')'`).
- Variable chips: clickable, insert the variable name at the cursor.
- Empty input is valid and means "no transformation". The parent stores `null` for `operation` in that case.

## Parser / printer / tree preview

`web/lib/ast/` is a new module with no React dependencies.

### `web/lib/ast/types.ts`

```ts
export type Expr =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string }
  | { kind: "binop"; op: "add" | "sub" | "mul" | "div"; left: Expr; right: Expr };
```

### `web/lib/ast/parseFormula.ts`

```ts
export type ParseResult =
  | { ok: true; expr: Expr }
  | { ok: false; error: { pos: number; message: string } };

export function parseFormula(text: string): ParseResult;
```

Recursive-descent parser, ~80 lines. Grammar:

```
expr    := term  (('+' | '-') term)*
term    := unary (('*' | '/') unary)*
unary   := '-' unary | factor
factor  := number | ident | '(' expr ')'
number  := /[0-9]+(\.[0-9]+)?/
ident   := /[a-zA-Z_][a-zA-Z0-9_]*/
```

Negation is desugared to `0 - x` at parse time, so the AST only needs the three nodes the backend already supports. If `Expr::Neg` lands later, we can change the desugar without breaking saved schemas.

Empty input returns `{ ok: true; expr: null as any }` is **not** the contract — the caller decides what to do with empty. The parent component treats empty as "no operation" and skips calling `parseFormula`.

### `web/lib/ast/printFormula.ts`

```ts
export function printFormula(expr: Expr): string;
```

Walks the AST and prints, adding parentheses only when precedence/associativity requires them. Round-trip property: `parseFormula(printFormula(expr)).expr` is structurally equal to `expr`.

### `web/lib/ast/treePreview.ts`

```ts
export function treePreview(expr: Expr): string;
```

Produces a multi-line ASCII tree (using `├─`, `│`, `└─`) for the live preview. Pure function, no React.

### `web/lib/ast/serialize.ts`

```ts
export function toBackend(expr: Expr): unknown;
export function fromBackend(json: unknown): Expr | null;  // null on malformed input
```

`toBackend` produces the snake_case discriminated union the Rust `serde` expects (`{ type: "num", value: 3.0 }`, `{ type: "var", name: "x" }`, `{ type: "bin_op", op: "Add", left: ..., right: ... }`). `fromBackend` is its inverse and returns `null` when the JSON does not match — used during schema hydration to flag legacy fields the new UI cannot represent.

## Type updates

`web/lib/api/types.ts`:

- `FieldType` becomes `"float" | "int" | "bool" | "string"` (adds `string`).
- `FieldSchema.operation` keeps its current loose type (`Record<string, unknown> | null`); the typed `Expr` lives behind `fromBackend` / `toBackend`.

`web/lib/schemas/validationSchema.ts`:

- Drop `builderSchema` (the JSON textarea zod schema).
- Add a new zod schema for the visual form: array of rows with the validated field constraints above.

## Raw-JSON escape hatch

At the bottom of the builder, a collapsed `<details>` element:

```
[▸ show raw JSON]
```

When expanded, shows a syntax-highlighted, **read-only** JSON view of the current schema (computed from the visual state). Useful for debugging or copy-pasting into Swagger. We deliberately keep it read-only: making it editable would double the validation surface (visual ↔ JSON synchronization, conflict resolution when both diverge) for marginal value.

## Hydration / load existing schema

`/schemas/[id]/page.tsx` (assumed; mirrors other detail pages):

- Calls `useSchema(id)` to fetch the `ValidationSchema`.
- Builds the initial row array by iterating `schema` entries:
  - `name = key`
  - `type, required, default, validation` map directly.
  - `formula = expr ? printFormula(fromBackend(expr)) : ""` — if `fromBackend` returns `null`, the row marks the formula slot with a warning: `× could not load this formula — clear and rebuild`. The rest of the row is editable.

The user can keep editing the schema without losing other fields.

## Backend assumptions

- `FieldType` already includes `String` server-side (`crates/domain/src/ast/schemas.rs:33`). No backend change.
- The AST already accepts the three node kinds (`Num`, `Var`, `BinOp`) with operators `Add | Sub | Mul | Div`. The frontend will not produce nodes outside this set. No backend change.
- Empty operation means "no transformation", which is the current contract (`Option<Expr>` is `None`).

## Affected files

```
web/components/forms/SchemaBuilder.tsx        (rewrite)
web/components/forms/SchemaFieldRow.tsx       (new)
web/components/forms/FormulaEditor.tsx        (new)
web/lib/ast/types.ts                          (new)
web/lib/ast/parseFormula.ts                   (new)
web/lib/ast/printFormula.ts                   (new)
web/lib/ast/treePreview.ts                    (new)
web/lib/ast/serialize.ts                      (new)
web/lib/api/types.ts                          (FieldType adds "string")
web/lib/schemas/validationSchema.ts           (replace builderSchema)
web/test/ast/parseFormula.test.ts             (new unit tests)
web/test/ast/printFormula.test.ts             (new unit tests)
web/test/ast/serialize.test.ts                (new unit tests)
```

## Testing

### Unit (vitest)

- `parseFormula` rejects: unbalanced parens, trailing operator, unexpected tokens, empty `()`, identifier with leading digit.
- `parseFormula` accepts: integer and decimal numbers, single identifier, all four binops, nested parens, negative literals, deep nesting.
- Operator precedence: `1 + 2 * 3` parses as `1 + (2 * 3)`.
- Associativity: `1 - 2 - 3` parses as `(1 - 2) - 3`.
- `printFormula(parseFormula(text).expr)` recovers the text up to whitespace and redundant parens for ~10 hand-written cases.
- `toBackend(fromBackend(json))` round-trips for fixtures matching the Rust serde shape.

### Manual

Create a schema named `weather` with three fields:

- `temperature_raw`: float, required, min `-50`, max `150`, no formula.
- `temperature_c`: float, required, formula `(temperature_raw - 32) * 0.5`.
- `device_name`: string, required, no min/max, no formula.

Submit, reopen `/schemas/<id>`. All three rows hydrate, formula round-trips, the raw-JSON disclosure shows the expected shape. Edit `temperature_c` formula to invalid (`(temperature_raw - 32) *`), submit button disables, error message points to the trailing `*`.

## Risks

- **Parser is new and on the critical path.** A bug in `parseFormula` or `toBackend` produces stored schemas that the Rust VM cannot run; pipelines silently reject every record. Mitigations: aggressive unit tests, the in-UI tree preview gives the user immediate feedback before saving, and round-trip tests cover the encode/decode boundary.
- **Negation desugar (`-x` → `0 - x`).** Cosmetic only — the printed formula will read `0 - x` when reloading. If users find this jarring, a follow-up can either add `Expr::Neg` server-side or print unary-minus specially. Not blocking.
- **Re-render cost.** Every keystroke parses the formula. Debounced at 100 ms; each `SchemaFieldRow` is memoized so a row's keystroke doesn't redraw siblings. Acceptable for ≤ ~100 fields, which is far above realistic schemas.
- **Read-only raw JSON disclosure** is technically a regression for the one power user who pasted JSON straight into the textarea. They can still craft schemas via Swagger / the API if needed. Acceptable trade for the simpler UI.
