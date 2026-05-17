import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../Button";

describe("Button", () => {
  it("renders children and default variant", () => {
    render(<Button>NEW</Button>);
    expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument();
  });
  it("applies the variant via data-variant", () => {
    render(<Button variant="danger">delete</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", "danger");
  });
  it("supports the disabled state", () => {
    render(<Button disabled>x</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
