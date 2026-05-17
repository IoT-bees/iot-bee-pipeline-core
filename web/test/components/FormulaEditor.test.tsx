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
    expect(screen.getByText(/valid/i)).toBeInTheDocument();
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
    expect(screen.getByText(/unexpected end/i)).toBeInTheDocument();
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
});
