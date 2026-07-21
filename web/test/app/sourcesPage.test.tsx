import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sourcesApiMock = vi.hoisted(() => ({
  list: vi.fn(),
  test: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/api/endpoints/sources", () => ({
  sourcesApi: sourcesApiMock,
}));

import { SourcesClient } from "@/app/(app)/sources/SourcesClient";

function withQuery(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const brokers = [
  {
    id: 3,
    name: "planta-norte",
    sourceType: "MQTT" as const,
    dataSourceDescription: "Telemetría de producción.",
    config: { broker_url: "mqtt://broker:1883", topic: "sensors/#", client_id: "north" },
  },
  {
    id: 4,
    name: "planta-sur",
    sourceType: "RABBIT_MQ" as const,
    dataSourceDescription: "Cola de respaldo.",
    config: { url: "amqp://rabbitmq:5672", queue_name: "telemetry", consumer_name: "south" },
  },
];

describe("SourcesClient", () => {
  beforeEach(() => {
    sourcesApiMock.list.mockReset();
    sourcesApiMock.test.mockReset();
    sourcesApiMock.remove.mockReset();
  });

  it("muestra el resumen real, los protocolos y enlaces a cada detalle", () => {
    render(withQuery(<SourcesClient initialData={brokers} />));

    expect(screen.getByRole("heading", { name: "Brokers" })).toBeInTheDocument();
    expect(screen.getByText("2 brokers configurados")).toBeInTheDocument();
    expect(screen.getByText("1 RabbitMQ · 1 MQTT")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "planta-norte" })[0]).toHaveAttribute("href", "/sources/3");
    expect(screen.getAllByRole("link", { name: "Ver" })[0]).toHaveAttribute("href", "/sources/3");
    expect(screen.queryByRole("link", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.getAllByText("MQTT").length).toBeGreaterThan(0);
  });

  it("aclara una búsqueda sin resultados y permite limpiarla", async () => {
    const user = userEvent.setup();
    render(withQuery(<SourcesClient initialData={brokers} />));

    await user.type(screen.getByRole("searchbox", { name: "Buscar" }), "no-existe");

    expect(screen.getByRole("heading", { name: "No hay coincidencias" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect(screen.getAllByRole("link", { name: "planta-norte" }).length).toBeGreaterThan(0);
  });

  it("ejecuta la verificación sin añadir su mensaje técnico a la tabla", async () => {
    const user = userEvent.setup();
    sourcesApiMock.test.mockResolvedValueOnce({
      ok: false,
      message: "No fue posible conectar con el broker.",
    });
    render(withQuery(<SourcesClient initialData={brokers} />));

    await user.click(screen.getAllByRole("button", { name: "Verificar" })[0]);

    await waitFor(() => {
      expect(sourcesApiMock.test).toHaveBeenCalledWith(3);
    });
    expect(screen.queryByText("No fue posible conectar con el broker.")).not.toBeInTheDocument();
  });

  it("distingue un fallo al cargar de una lista sin brokers", async () => {
    sourcesApiMock.list.mockRejectedValueOnce(new Error("API no disponible"));
    render(withQuery(<SourcesClient />));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar los brokers");
    });
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    expect(screen.queryByText("Crear el primer broker")).not.toBeInTheDocument();
  });
});
