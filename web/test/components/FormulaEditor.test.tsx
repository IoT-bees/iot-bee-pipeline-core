import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FormulaEditor } from "@/components/forms/FormulaEditor";

describe("FormulaEditor", () => {
  it("renders the current value and a valid badge for a parseable formula", () => {
    render(
      <FormulaEditor
        fieldName="tempC"
        availableVariables={["temperature"]}
        value="(temperature - 32) * 0.5"
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("(temperature - 32) * 0.5");
    expect(screen.getByText(/fórmula válida/i)).toBeInTheDocument();
  });

  it("shows an error message when the formula is unparseable", () => {
    render(
      <FormulaEditor
        fieldName="tempC"
        availableVariables={[]}
        value="(temperature - 32) *"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/revisa la fórmula en la columna/i)).toBeInTheDocument();
  });

  it("calls onChange when the user types", () => {
    const onChange = vi.fn();
    render(
      <FormulaEditor
        fieldName="tempC"
        availableVariables={["temperature"]}
        value=""
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "temperature * 0.1" },
    });
    expect(onChange).toHaveBeenCalledWith("temperature * 0.1");
  });

  it("treats empty input as valid (means: no transformation)", () => {
    render(
      <FormulaEditor
        fieldName="tempC"
        availableVariables={[]}
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText(/error|unexpected/i)).not.toBeInTheDocument();
  });

  it("explica la entrada, la transformación y el resultado cuando el campo aún no tiene nombre", () => {
    render(
      <FormulaEditor
        fieldName=""
        availableVariables={[]}
        value=""
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Fórmula para este campo")).toBeInTheDocument();
    expect(screen.getByText("Llega:", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Se guarda:", { exact: false })).toBeInTheDocument();
  });
});
