import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeployBar } from "@/components/pipelines/canvas/DeployBar";

describe("DeployBar", () => {
  it("CTA is disabled and shows the blocked reason when reason is non-null", () => {
    render(
      <DeployBar
        name=""
        replicas={1}
        blockedReason="Falta seleccionar una conexión"
        onNameChange={vi.fn()}
        onReplicasChange={vi.fn()}
        onDeploy={vi.fn()}
        deploying={false}
      />,
    );
    expect(screen.getByRole("button", { name: /crear proyecto/i })).toBeDisabled();
    expect(screen.getByText(/falta seleccionar una conexión/i)).toBeInTheDocument();
  });

  it("CTA fires onDeploy when reason is null", () => {
    const onDeploy = vi.fn();
    render(
      <DeployBar
        name="p1"
        replicas={1}
        blockedReason={null}
        onNameChange={vi.fn()}
        onReplicasChange={vi.fn()}
        onDeploy={onDeploy}
        deploying={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /crear proyecto/i }));
    expect(onDeploy).toHaveBeenCalled();
  });

  it("shows the creating label while deploying and disables CTA", () => {
    render(
      <DeployBar
        name="p1"
        replicas={1}
        blockedReason={null}
        onNameChange={vi.fn()}
        onReplicasChange={vi.fn()}
        onDeploy={vi.fn()}
        deploying={true}
      />,
    );
    expect(screen.getByRole("button", { name: /creando proyecto/i })).toBeDisabled();
  });

  it("offers a full-width, labelled project name field with its character count", () => {
    render(
      <DeployBar
        name="telemetría de la sede norte"
        replicas={1}
        blockedReason={null}
        onNameChange={vi.fn()}
        onReplicasChange={vi.fn()}
        onDeploy={vi.fn()}
        deploying={false}
      />,
    );
    expect(screen.getByLabelText("Nombre")).toHaveValue("telemetría de la sede norte");
    expect(screen.getByText("27/30 caracteres")).toBeInTheDocument();
  });
});
