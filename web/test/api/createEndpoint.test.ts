import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { storesApi } from "@/lib/api/endpoints/stores";

const originalFetch = globalThis.fetch;

describe("storesApi.create", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("resolves without throwing when the backend returns 201 with an empty body", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("", { status: 201 }),
    );

    await expect(
      storesApi.create({
        name: "influx-prod",
        dataStoreConfiguration: {
          persistenceType: "LOCAL_LOG",
          log_name: "debug",
        },
        dataStoreDescription: "test",
      }),
    ).resolves.toBeUndefined();
  });
});
