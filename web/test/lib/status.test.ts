import { describe, expect, it } from "vitest";
import {
  toPillState,
  isHealthy,
  isDegraded,
  canStop,
} from "@/lib/status";

describe("toPillState", () => {
  it("maps Healthy to running (green)", () => {
    expect(toPillState("Healthy")).toBe("running");
  });
  it("maps Idle to idle (gray)", () => {
    expect(toPillState("Idle")).toBe("idle");
  });
  it("maps Degraded to error (red)", () => {
    expect(toPillState("Degraded")).toBe("error");
  });
  it("treats missing or unknown values as idle", () => {
    expect(toPillState(undefined)).toBe("idle");
    expect(toPillState("STOPPED")).toBe("idle");
    expect(toPillState("nonsense")).toBe("idle");
  });
});

describe("isHealthy / isDegraded", () => {
  it("isHealthy is true only for Healthy", () => {
    expect(isHealthy("Healthy")).toBe(true);
    expect(isHealthy("Degraded")).toBe(false);
    expect(isHealthy("Idle")).toBe(false);
    expect(isHealthy(undefined)).toBe(false);
  });
  it("isDegraded is true only for Degraded", () => {
    expect(isDegraded("Degraded")).toBe(true);
    expect(isDegraded("Healthy")).toBe(false);
    expect(isDegraded(undefined)).toBe(false);
  });
});

describe("canStop", () => {
  it("returns true for Healthy or Degraded (the pipeline is active)", () => {
    expect(canStop("Healthy")).toBe(true);
    expect(canStop("Degraded")).toBe(true);
  });
  it("returns false for Idle, undefined, or STOPPED", () => {
    expect(canStop("Idle")).toBe(false);
    expect(canStop(undefined)).toBe(false);
    expect(canStop("STOPPED")).toBe(false);
  });
});
