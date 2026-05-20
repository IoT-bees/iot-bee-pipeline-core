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
