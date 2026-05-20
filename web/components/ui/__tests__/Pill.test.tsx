import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pill } from "../Pill";

describe("Pill", () => {
  it("renders running state", () => {
    render(<Pill state="running">RUNNING</Pill>);
    expect(screen.getByText("RUNNING")).toBeInTheDocument();
  });
});
