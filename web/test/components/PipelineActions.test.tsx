import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PipelineActions } from "@/components/pipelines/PipelineActions";

const { stopMutate, stopReset } = vi.hoisted(() => ({
  stopMutate: vi.fn(),
  stopReset: vi.fn(),
}));

vi.mock("@/lib/hooks/useStartPipeline", () => ({
  useStartPipeline: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/lib/hooks/useStopPipeline", () => ({
  useStopPipeline: () => ({
    mutate: stopMutate,
    reset: stopReset,
    isPending: false,
    error: null,
  }),
}));

vi.mock("@/lib/store/useToasts", () => ({
  useToasts: (selector: (store: { push: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ push: vi.fn() }),
}));

describe("PipelineActions", () => {
  it("does not show start or stop before the operational status is known", () => {
    render(<PipelineActions id={42} name="telemetría" />);

    expect(screen.getByRole("button", { name: "Comprobando estado" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /iniciar|detener/i })).not.toBeInTheDocument();
  });

  it("requires a second explicit confirmation before stopping a running project", () => {
    render(<PipelineActions id={42} name="telemetría" status="Healthy" />);

    fireEvent.click(screen.getByRole("button", { name: /detener/i }));

    expect(stopMutate).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Confirma que autorizas detener/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sí, detener proyecto" }));

    expect(stopMutate).toHaveBeenCalledWith(42, expect.any(Object));
  });
});
