import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routerPush = vi.hoisted(() => vi.fn());
const createMutation = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
  error: null as Error | null,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("@/lib/hooks/useGroups", () => ({
  useCreateGroup: () => createMutation,
}));

import NewGroupPage from "@/app/(app)/groups/new/page";

describe("Group forms", () => {
  beforeEach(() => {
    routerPush.mockReset();
    createMutation.mutateAsync.mockReset().mockResolvedValue(undefined);
    createMutation.error = null;
  });

  it("shows clear validation before creating a group", async () => {
    const user = userEvent.setup();
    render(<NewGroupPage />);

    await user.click(screen.getByRole("button", { name: "Crear grupo" }));

    expect(await screen.findByText("Ingresa un nombre para el grupo.")).toBeInTheDocument();
    expect(screen.getByText("Describe el propósito del grupo.")).toBeInTheDocument();
    expect(createMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it("creates a trimmed group and returns to the list", async () => {
    const user = userEvent.setup();
    render(<NewGroupPage />);

    await user.type(screen.getByLabelText("Nombre del grupo"), "  Andina  ");
    await user.type(screen.getByLabelText("Propósito"), "  Operación de Bogotá  ");
    await user.click(screen.getByRole("button", { name: "Crear grupo" }));

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith({
        name: "Andina",
        description: "Operación de Bogotá",
      });
      expect(routerPush).toHaveBeenCalledWith("/groups");
    });
  });

});
