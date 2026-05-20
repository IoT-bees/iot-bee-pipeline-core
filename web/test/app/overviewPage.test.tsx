import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/lib/hooks/usePipelineStatusAll", () => ({
  usePipelineStatusAll: () => ({ data: [], isLoading: false, isPending: false }),
}));

import { AppDashboardClient } from "@/app/(app)/app/AppDashboardClient";

function withQuery(children: ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("Overview page", () => {
  it("lists a pipeline that exists in the DB even when the status endpoint is empty", () => {
    render(
      withQuery(
        <AppDashboardClient
          initial={{
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
          }}
        />,
      ),
    );
    expect(screen.getAllByText("weather-ingest").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/stopped/i).length).toBeGreaterThan(0);
  });
});
