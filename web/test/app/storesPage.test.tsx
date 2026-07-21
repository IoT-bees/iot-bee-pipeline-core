import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storesApiMock = vi.hoisted(() => ({
  list: vi.fn(),
  test: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/api/endpoints/stores", () => ({
  storesApi: storesApiMock,
}));

import { StoresClient } from "@/app/(app)/stores/StoresClient";

function withQuery(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const destinations = [
  {
    id: 8,
    name: "receptor-produccion",
    storeType: "WEBHOOK" as const,
    dataStoreDescription: "Entrega los datos validados al sistema del cliente.",
    config: { url: "https://example.com/events", bearer_token: "" },
  },
  {
    id: 9,
    name: "registro-local",
    storeType: "LOCAL_LOG" as const,
    dataStoreDescription: "Registro de diagnóstico.",
    config: { log_name: "diagnostico" },
  },
];

describe("StoresClient", () => {
  beforeEach(() => {
    storesApiMock.list.mockReset();
    storesApiMock.test.mockReset();
    storesApiMock.remove.mockReset();
  });

  it("muestra los tipos y enlaces a cada detalle", () => {
    render(withQuery(<StoresClient initialData={destinations} />));

    expect(screen.getByRole("heading", { name: "Destinos de datos" })).toBeInTheDocument();
    expect(screen.getByText("Configura y verifica el destino de los datos validados.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "receptor-produccion" })[0]).toHaveAttribute("href", "/stores/8");
    expect(screen.getAllByText("Webhook").length).toBeGreaterThan(0);
  });

  it("aclara una búsqueda sin resultados y permite limpiarla", async () => {
    const user = userEvent.setup();
    render(withQuery(<StoresClient initialData={destinations} />));

    await user.type(screen.getByRole("searchbox", { name: "Buscar" }), "no-existe");

    expect(screen.getByRole("heading", { name: "No hay coincidencias" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect(screen.getAllByRole("link", { name: "receptor-produccion" }).length).toBeGreaterThan(0);
  });

  it("muestra el resultado real de una verificación fallida", async () => {
    const user = userEvent.setup();
    storesApiMock.test.mockResolvedValueOnce({
      ok: false,
      message: "No fue posible conectar con el endpoint.",
    });
    render(withQuery(<StoresClient initialData={destinations} />));

    await user.click(screen.getAllByRole("button", { name: "Verificar" })[0]);

    await waitFor(() => {
      expect(screen.getAllByRole("status")[0]).toHaveTextContent("No fue posible conectar con el endpoint.");
    });
  });

  it("no repite una verificación exitosa dentro de la fila", async () => {
    const user = userEvent.setup();
    const message = "La configuración guardada de WEBHOOK es válida.";
    storesApiMock.test.mockResolvedValueOnce({ ok: true, message });
    render(withQuery(<StoresClient initialData={destinations} />));

    await user.click(screen.getAllByRole("button", { name: "Verificar" })[0]);

    await waitFor(() => {
      expect(storesApiMock.test).toHaveBeenCalledWith(8);
    });
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  });

  it("distingue un fallo al cargar de una lista sin destinos", async () => {
    storesApiMock.list.mockRejectedValueOnce(new Error("API no disponible"));
    render(withQuery(<StoresClient />));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar los destinos");
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Revisa tu conexión e inténtalo de nuevo.");
    expect(screen.queryByText("API no disponible")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    expect(screen.queryByText("Aún no has creado destinos")).not.toBeInTheDocument();
  });
});
