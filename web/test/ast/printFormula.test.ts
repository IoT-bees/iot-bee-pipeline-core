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
