import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SchemaBuilder } from "@/components/forms/SchemaBuilder";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("SchemaBuilder", () => {
  it("explica un rango inválido antes de guardar", () => {
    const onSubmit = vi.fn();

    render(
      <SchemaBuilder
        defaultName="telemetria"
        defaultSchema={{
          temperature: {
            type: "float",
            required: true,
            validation: { min: 50, max: 10 },
          },
        }}
        submitLabel="Guardar cambios"
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "el mínimo no puede ser mayor que el máximo",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mantiene el nombre bloqueado al editar", () => {
    render(
      <SchemaBuilder
        defaultName="telemetria"
        defaultSchema={{
          temperature: { type: "float", required: true },
        }}
        nameReadOnly
        submitLabel="Guardar cambios"
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("telemetria")).toBeDisabled();
    expect(
      screen.getByText("El nombre no se puede modificar después de crear la definición."),
    ).toBeInTheDocument();
  });

  it("muestra la guía de campos bajo demanda", () => {
    render(
      <SchemaBuilder
        submitLabel="Crear definición"
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ayuda" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Configura el tipo, obligatoriedad y los límites válidos para cada campo.",
    );
  });

  it("despliega la vista JSON a todo el ancho debajo de las acciones", () => {
    render(
      <SchemaBuilder
        defaultName="telemetria"
        defaultSchema={{
          temperature: { type: "float", required: true },
        }}
        submitLabel="Crear definición"
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver JSON" }));
    expect(screen.getByRole("button", { name: "Ocultar JSON" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(document.getElementById("schema-json-preview")).toHaveTextContent(
      '"temperature"',
    );
  });

  it("permite consultar el JSON aunque la definición esté bloqueada", () => {
    render(
      <SchemaBuilder
        defaultName="telemetria"
        defaultSchema={{
          temperature: { type: "float", required: true },
        }}
        disabled
        submitLabel="Guardar cambios"
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Agregar campo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ver JSON" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Ver JSON" }));
    expect(document.getElementById("schema-json-preview")).toBeInTheDocument();
  });
});
