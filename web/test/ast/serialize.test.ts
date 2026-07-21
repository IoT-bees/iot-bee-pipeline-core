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
