import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditFieldButton } from "@/components/pipelines/EditFieldButton";

const options = [
  { id: 1, name: "mqtt-a" },
  { id: 2, name: "mqtt-b" },
];

function withQueryClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  qc.setQueryData(["sources"], options);
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe("EditFieldButton", () => {
  it("opens a dialog with the current value pre-selected", () => {
    render(
      withQueryClient(
        <EditFieldButton
          label="source"
          currentId={2}
          onChange={vi.fn()}
          pipelineStatus="Idle"
        />,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("2");
  });

  it("calls onChange with the chosen id and closes the dialog", async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(
      withQueryClient(
        <EditFieldButton
          label="source"
          currentId={1}
          onChange={onChange}
          pipelineStatus="Idle"
        />,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("disables apply and shows a warning when the pipeline is Healthy", () => {
    render(
      withQueryClient(
        <EditFieldButton
          label="source"
          currentId={1}
          onChange={vi.fn()}
          pipelineStatus="Healthy"
        />,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByText(/stop it first/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
  });
});
