import { describe, expect, it } from "vitest";
import { defaultTab } from "@/components/pipelines/canvas/defaultTab";

describe("defaultTab", () => {
  it("returns 'new' when no existing resources match", () => {
    expect(defaultTab(0)).toBe("new");
  });

  it("returns 'existing' when ≥1 match", () => {
    expect(defaultTab(1)).toBe("existing");
    expect(defaultTab(5)).toBe("existing");
  });
});
