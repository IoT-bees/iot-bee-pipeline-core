import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CanvasPaletteItem } from "@/components/pipelines/canvas/CanvasPaletteItem";
import { DND_MIME } from "@/components/pipelines/canvas/dnd";

describe("CanvasPaletteItem", () => {
  it("writes a JSON payload with the correct mime on dragstart", () => {
    const setData = vi.fn();
    render(
      <CanvasPaletteItem
        slotKind="source"
        resourceType="MQTT"
        label="mqtt"
        armed={false}
        onArmToggle={vi.fn()}
      />,
    );
    const item = screen.getByRole("button", { name: /mqtt/i });
    fireEvent.dragStart(item, { dataTransfer: { setData, effectAllowed: "" } });
    expect(setData).toHaveBeenCalledWith(DND_MIME, JSON.stringify({ slotKind: "source", resourceType: "MQTT" }));
  });

  it("calls onArmToggle on click", () => {
    const onArmToggle = vi.fn();
    render(
      <CanvasPaletteItem
        slotKind="source"
        resourceType="KAFKA"
        label="kafka"
        armed={false}
        onArmToggle={onArmToggle}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /kafka/i }));
    expect(onArmToggle).toHaveBeenCalled();
  });

  it("reflects armed state via aria-pressed", () => {
    render(
      <CanvasPaletteItem
        slotKind="store"
        resourceType="INFLUX_DB"
        label="influx"
        armed={true}
        onArmToggle={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /influx/i })).toHaveAttribute("aria-pressed", "true");
  });
});
