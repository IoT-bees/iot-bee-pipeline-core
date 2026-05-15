import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RescaleControl } from "@/components/pipelines/RescaleControl";

describe("RescaleControl", () => {
  it("does not show an apply button until the value changes", () => {
    render(
      <RescaleControl
        currentValue={3}
        onApply={vi.fn()}
        pipelineStatus="Idle"
      />,
    );
    expect(
      screen.queryByRole("button", { name: /apply/i }),
    ).not.toBeInTheDocument();
  });

  it("clamps at 1 when decrementing past the minimum", () => {
    render(
      <RescaleControl
        currentValue={1}
        onApply={vi.fn()}
        pipelineStatus="Idle"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "−" }));
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("calls onApply with the new value when applied", async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      <RescaleControl
        currentValue={2}
        onApply={onApply}
        pipelineStatus="Idle"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    expect(onApply).toHaveBeenCalledWith(3);
  });

  it("disables apply when the pipeline is running", () => {
    render(
      <RescaleControl
        currentValue={2}
        onApply={vi.fn()}
        pipelineStatus="Healthy"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
    expect(screen.getByText(/stop it first/i)).toBeInTheDocument();
  });
});
