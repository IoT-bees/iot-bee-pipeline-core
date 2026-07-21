import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const statusState = vi.hoisted(() => ({
  current: {
    data: [] as unknown,
    isPending: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  },
}));

vi.mock("@/lib/hooks/usePipelineStatusAll", () => ({
  usePipelineStatusAll: () => statusState.current,
}));

import { AppDashboardClient } from "@/app/(app)/app/AppDashboardClient";

function withQuery(children: ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("Overview page", () => {
  const initial = {
    pipelines: [
      {
        id: 7,
        name: "weather-ingest",
        replicationFactor: 1,
        isActive: false,
        dataSource: { id: 1, name: "s" },
        dataStore: { id: 1, name: "d" },
        dataValidationSchema: { id: 1, name: "v" },
        pipelineGroup: { id: 1, name: "g" },
      },
    ],
    sources: [],
    stores: [],
    schemas: [],
    groups: [],
  };

  beforeEach(() => {
    statusState.current = {
      data: [],
      isPending: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    };
  });

  it("lists a pipeline that exists in the DB even when the status endpoint is empty", () => {
    render(
      withQuery(
        <AppDashboardClient
          initial={initial}
        />,
      ),
    );
    expect(screen.getAllByText("weather-ingest").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/detenido/i).length).toBeGreaterThan(0);
  });

  it("does not present an unknown operational status as stopped", () => {
    statusState.current = {
      data: undefined,
      isPending: false,
      isFetching: false,
      isError: true,
      refetch: vi.fn(),
    };

    render(withQuery(<AppDashboardClient initial={initial} />));

    expect(screen.getByText("Estado operativo no disponible")).toBeInTheDocument();
    expect(screen.getAllByText("NO DISPONIBLE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Actividad no disponible").length).toBeGreaterThan(0);
  });

  it("makes a pending status refresh explicit", () => {
    statusState.current = {
      data: undefined,
      isPending: true,
      isFetching: true,
      isError: false,
      refetch: vi.fn(),
    };

    render(withQuery(<AppDashboardClient initial={initial} />));

    expect(
      screen.getByText("Actualizando el estado operativo de los proyectos…"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("ACTUALIZANDO").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Actualizando actividad…").length).toBeGreaterThan(0);
  });

  it("keeps the metric cards calm when all projects are healthy", () => {
    statusState.current = {
      data: [
        {
          pipeline_id: 7,
          pipeline_name: "weather-ingest",
          pipeline_general_status: "HEALTHY",
          replica_statuses: {},
          replicas: [],
        },
      ],
      isPending: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    };

    render(withQuery(<AppDashboardClient initial={initial} />));

    const runningMetric = screen.getByText("Proyectos en ejecución");
    expect(runningMetric.parentElement).not.toHaveClass("border-l-2");
    expect(screen.getByText("de 1 proyecto")).toBeInTheDocument();
    expect(screen.getAllByText("OPERATIVO").length).toBeGreaterThan(0);
    expect(screen.getByText("Revisa el estado y atiende incidencias.")).toBeInTheDocument();
    expect(screen.getByText("Sin recursos configurados")).toBeInTheDocument();
    expect(
      screen.queryByText("Todos los proyectos están operando con normalidad."),
    ).not.toBeInTheDocument();
  });
});
