import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/lib/hooks/usePipelineStatusAll", () => ({
  usePipelineStatusAll: () => ({ data: [], isLoading: false, isPending: false }),
}));
vi.mock("@/lib/hooks/usePipelines", () => ({
  usePipelines: () => ({
    data: [
      {
        id: 7,
        name: "weather-ingest",
        replicationFactor: 1,
        isActive: false,
      },
    ],
    isPending: false,
  }),
}));
vi.mock("@/lib/hooks/useSources", () => ({
  useSources: () => ({ data: [], isPending: false }),
}));
vi.mock("@/lib/hooks/useStores", () => ({
  useStores: () => ({ data: [], isPending: false }),
}));
vi.mock("@/lib/hooks/useSchemas", () => ({
  useSchemas: () => ({ data: [], isPending: false }),
}));
vi.mock("@/lib/hooks/useGroups", () => ({
  useGroups: () => ({ data: [], isPending: false }),
}));

import Overview from "@/app/(app)/app/page";

function withQuery(children: ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("Overview page", () => {
  it("lists a pipeline that exists in the DB even when the status endpoint is empty", () => {
    render(withQuery(<Overview />));
    expect(screen.getAllByText("weather-ingest").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/stopped/i).length).toBeGreaterThan(0);
  });
});
