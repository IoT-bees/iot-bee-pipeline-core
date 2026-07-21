import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminApi } from "@/lib/api/endpoints/admin";

const originalFetch = globalThis.fetch;

describe("adminApi pagination contracts", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends user search, status and cursor through the authenticated BFF", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ items: [], nextCursor: null }), { status: 200 }),
    );

    await adminApi.listUsers({ q: "ana", status: "active", cursor: 91, limit: 50 });

    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      "/api/proxy/admin/users?cursor=91&limit=50&q=ana&status=active",
    );
  });

  it("uses a cursor for billing events instead of requesting an unbounded table", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ items: [], nextCursor: null }), { status: 200 }),
    );

    await adminApi.listBillingEvents({ limit: 50, cursor: 44 });

    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      "/api/proxy/admin/billing/events?limit=50&cursor=44",
    );
  });
});
