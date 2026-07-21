import { fireEvent, render, screen } from "@testing-library/react";
import { vi, describe, expect, it } from "vitest";
import { NavigationProgress } from "@/components/providers/NavigationProgress";

vi.mock("next/navigation", () => ({
  usePathname: () => "/schemas",
}));

describe("NavigationProgress", () => {
  it("muestra de inmediato el estado de carga al navegar a otra sección", () => {
    render(<NavigationProgress />);
    const link = document.createElement("a");
    link.href = "/schemas/new";
    link.innerHTML = "<span>Crear definición</span>";
    link.addEventListener("click", (event) => event.preventDefault());
    document.body.append(link);

    fireEvent.click(link.querySelector("span") as HTMLSpanElement);

    expect(screen.getByRole("status", { name: "Cargando sección" })).toBeInTheDocument();
  });
});
