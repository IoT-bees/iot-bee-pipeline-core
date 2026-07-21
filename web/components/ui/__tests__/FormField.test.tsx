import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField } from "../FormField";

describe("FormField", () => {
  it("renders the label without a decorative prefix", () => {
    render(
      <FormField label="NAME">
        <input />
      </FormField>,
    );
    expect(screen.getByText("NAME")).toBeInTheDocument();
  });
  it("renders error", () => {
    render(
      <FormField label="X" error="required">
        <input />
      </FormField>,
    );
    expect(screen.getByText(/× required/)).toBeInTheDocument();
  });
  it("renders hint when no error", () => {
    render(
      <FormField label="X" hint="ex">
        <input />
      </FormField>,
    );
    expect(screen.getByText("ex")).toBeInTheDocument();
  });
});
