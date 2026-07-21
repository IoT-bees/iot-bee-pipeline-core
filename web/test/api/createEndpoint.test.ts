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

  it("sends a webhook destination with its optional client authorization", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("", { status: 201 }),
    );

    await storesApi.create({
      name: "client-erp-webhook",
      dataStoreConfiguration: {
        persistenceType: "WEBHOOK",
        url: "https://client.example.com/iot/events",
        bearer_token: "client-token",
      },
      dataStoreDescription: "validated records for the client ERP",
    });

    const [, request] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(request.body)).toEqual({
      name: "client-erp-webhook",
      dataStoreConfiguration: {
        persistenceType: "WEBHOOK",
        url: "https://client.example.com/iot/events",
        bearer_token: "client-token",
      },
      dataStoreDescription: "validated records for the client ERP",
    });
  });

  it("sends the selected destination ID to the configuration check endpoint", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ ok: true, message: "Configuración válida." }), { status: 200 }),
    );

    await expect(storesApi.test(42)).resolves.toEqual({
      ok: true,
      message: "Configuración válida.",
    });

    const [url, request] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/proxy/data-stores/42/test");
    expect(request.method).toBe("POST");
    expect(request.body).toBeUndefined();
  });
});
