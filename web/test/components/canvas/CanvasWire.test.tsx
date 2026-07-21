import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CanvasWire } from "@/components/pipelines/canvas/CanvasWire";

describe("CanvasWire", () => {
  it("renders dim when not active", () => {
    render(<CanvasWire active={false} />);
    expect(screen.getByTestId("wire").className).toMatch(/dim/);
  });

  it("renders flowing when active", () => {
    render(<CanvasWire active={true} />);
    expect(screen.getByTestId("wire").className).toMatch(/flow-line/);
  });
});
