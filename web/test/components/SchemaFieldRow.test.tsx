import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  SchemaFieldRow,
  type FieldRow,
} from "@/components/forms/SchemaFieldRow";

const baseRow: FieldRow = {
  name: "temperature",
  type: "float",
  required: true,
  defaultValue: "",
  min: "-40",
  max: "85",
  formula: "",
};

describe("SchemaFieldRow", () => {
  it("renders the current values", () => {
    render(
      <SchemaFieldRow
        row={baseRow}
        availableVariables={[]}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect((screen.getByLabelText(/^nombre$/i) as HTMLInputElement).value).toBe(
      "temperature",
    );
    expect((screen.getByLabelText(/^mínimo$/i) as HTMLInputElement).value).toBe(
      "-40",
    );
  });

  it("calls onChange when the user edits a field", () => {
    const onChange = vi.fn();
    render(
      <SchemaFieldRow
        row={baseRow}
        availableVariables={[]}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: "temp" },
    });
    expect(onChange).toHaveBeenCalledWith({ ...baseRow, name: "temp" });
  });

  it("shows the type options below its control and updates the type", () => {
    const onChange = vi.fn();
    render(
      <SchemaFieldRow
        row={baseRow}
        availableVariables={[]}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^tipo$/i }));
    expect(screen.getByRole("listbox", { name: /opciones de tipo/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: "int" }));
    expect(onChange).toHaveBeenCalledWith({ ...baseRow, type: "int" });
  });

  it("disables min/max/formula when type is bool", () => {
    render(
      <SchemaFieldRow
        row={{ ...baseRow, type: "bool" }}
        availableVariables={[]}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/^mínimo$/i)).toBeDisabled();
    expect(screen.getByLabelText(/^máximo$/i)).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /fórmula/i }),
    ).toBeDisabled();
  });

  it("calls onRemove when the delete button is clicked", () => {
    const onRemove = vi.fn();
    render(
      <SchemaFieldRow
        row={baseRow}
        availableVariables={[]}
        onChange={vi.fn()}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /eliminar campo/i }));
    expect(onRemove).toHaveBeenCalled();
  });
});
