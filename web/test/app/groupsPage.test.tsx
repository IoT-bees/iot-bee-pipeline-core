import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Pipeline, PipelineStatus } from "@/lib/api/types";

const pipelineState = vi.hoisted(() => ({
  current: {
    data: [] as Pipeline[] | undefined,
    isPending: false,
    isError: false,
  },
}));

const statusState = vi.hoisted(() => ({
  current: {
    data: [] as PipelineStatus[] | undefined,
    isPending: false,
    isError: false,
  },
}));

vi.mock("@/lib/hooks/usePipelines", () => ({
  usePipelines: () => pipelineState.current,
}));

vi.mock("@/lib/hooks/usePipelineStatusAll", () => ({
  usePipelineStatusAll: () => statusState.current,
}));

vi.mock("@/lib/hooks/useGroups", () => ({
  useDeleteGroup: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useMovePipelineToGroup: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock("@/lib/hooks/useConfirmDelete", () => ({
  useConfirmDelete: () => ({
    pending: null,
    error: null,
    ask: vi.fn(),
    cancel: vi.fn(),
    confirm: vi.fn(),
  }),
}));

import { GroupsClient } from "@/app/(app)/groups/GroupsClient";

const group = { id: 1, name: "Andina", description: "Operación de Bogotá" };
const pipeline: Pipeline = {
  id: 7,
  name: "weather-ingest",
  replicationFactor: 1,
  isActive: false,
  dataSource: { id: 1, name: "Broker MQTT" },
  dataStore: { id: 1, name: "Influx" },
  dataValidationSchema: { id: 1, name: "Métrica" },
  pipelineGroup: { id: 1, name: "Andina" },
};

function withQuery(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("Groups page", () => {
  beforeEach(() => {
    pipelineState.current = { data: [pipeline], isPending: false, isError: false };
    statusState.current = { data: [], isPending: false, isError: false };
  });

  it("does not present an unavailable operational state as stopped", () => {
    statusState.current = { data: undefined, isPending: false, isError: true };

    render(withQuery(<GroupsClient initialData={[group]} />));

    expect(screen.getByText("El estado operativo no está disponible. Los proyectos se muestran, pero no podemos confirmar su ejecución.")).toBeInTheDocument();
    expect(screen.getAllByText("NO DISPONIBLE").length).toBeGreaterThan(0);
    expect(screen.queryByText(/DETENIDO/)).not.toBeInTheDocument();
  });

  it("marks partial status data as unconfirmed instead of a clean metric", () => {
    render(withQuery(<GroupsClient initialData={[group]} />));

    expect(screen.getByText("Hay 1 proyecto sin estado operativo confirmado.")).toBeInTheDocument();
    expect(screen.getAllByText("1 SIN ESTADO").length).toBeGreaterThan(0);
  });

  it("keeps deletion disabled until project associations are known", () => {
    pipelineState.current = { data: undefined, isPending: false, isError: true };

    render(withQuery(<GroupsClient initialData={[group]} />));

    expect(screen.getByText("No pudimos comprobar los proyectos asociados. La eliminación queda desactivada hasta actualizar la lista.")).toBeInTheDocument();
    expect(screen.queryByText("SIN PROYECTOS")).not.toBeInTheDocument();
    expect(screen.getAllByText("ASOCIACIONES NO DISPONIBLES").length).toBeGreaterThan(0);
    for (const button of screen.getAllByRole("button", { name: "Eliminar" })) {
      expect(button).toBeDisabled();
    }
  });
});
