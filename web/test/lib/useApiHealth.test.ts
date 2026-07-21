import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getApiHealth } from "@/lib/hooks/useApiHealth";

const originalFetch = globalThis.fetch;

describe("getApiHealth", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("checks the backend health endpoint through the same-origin gateway", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), { status: 200 }),
    );

    await expect(getApiHealth()).resolves.toEqual({ status: "ok" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/proxy/health",
      expect.objectContaining({ cache: "no-store", credentials: "same-origin" }),
    );
  });

  it("rejects a successful response that is not a real health confirmation", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ status: "unknown" }), { status: 200 }),
    );

    await expect(getApiHealth()).rejects.toMatchObject({
      status: 502,
      code: "invalid_response",
    });
  });
});
