import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RescaleControl } from "@/components/pipelines/RescaleControl";
import { useToasts } from "@/lib/store/useToasts";

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
      screen.queryByRole("button", { name: /aplicar/i }),
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
    fireEvent.click(screen.getByRole("button", { name: "Reducir réplicas" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Aumentar réplicas" }));
    fireEvent.click(screen.getByRole("button", { name: /aplicar/i }));
    await waitFor(() => expect(onApply).toHaveBeenCalledWith(3));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /aplicar/i })).toBeEnabled(),
    );
  });

  it("allows hot scaling when the pipeline is running", () => {
    render(
      <RescaleControl
        currentValue={2}
        onApply={vi.fn()}
        pipelineStatus="Healthy"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Aumentar réplicas" }));
    expect(screen.getByRole("button", { name: /aplicar en vivo/i })).toBeEnabled();
    expect(screen.getByText(/se aplica en vivo/i)).toBeInTheDocument();
  });

  it("does not show a persistent plan notice while replicas are available", () => {
    render(
      <RescaleControl
        currentValue={2}
        maxValue={4}
        onApply={vi.fn()}
        pipelineStatus="Idle"
      />,
    );

    expect(screen.queryByText(/tu plan permite/i)).not.toBeInTheDocument();
  });

  it("shows a warning when increasing beyond the plan limit", () => {
    render(
      <RescaleControl
        currentValue={4}
        maxValue={4}
        onApply={vi.fn()}
        pipelineStatus="Idle"
      />,
    );

    const increaseButton = screen.getByRole("button", { name: "Aumentar réplicas" });
    expect(increaseButton).toBeEnabled();

    fireEvent.click(increaseButton);

    expect(useToasts.getState().toasts).toEqual([
      expect.objectContaining({
        kind: "warning",
        message: "Este proyecto ya tiene las 4 réplicas incluidas en tu plan.",
      }),
    ]);
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});
