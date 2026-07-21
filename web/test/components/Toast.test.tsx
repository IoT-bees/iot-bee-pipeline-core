import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Toast } from "@/components/ui/Toast";

describe("Toast", () => {
  it.each([
    ["error", "Error", "alert"],
    ["success", "Completado", "status"],
    ["info", "Información", "status"],
    ["warning", "Atención", "status"],
  ] as const)("identifies %s notifications", (kind, label, role) => {
    render(<Toast kind={kind} message="Mensaje de prueba" onDismiss={vi.fn()} />);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByRole(role)).toHaveTextContent("Mensaje de prueba");
  });

  it("allows a notification to be dismissed before it expires", () => {
    const onDismiss = vi.fn();
    render(<Toast kind="info" message="Mensaje de prueba" onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole("button", { name: /cerrar notificación: información/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
