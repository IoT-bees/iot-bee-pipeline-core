import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, isRetryableApiError } from "@/lib/api/client";
import {
  hasTrustedOrigin,
  isAllowedProxyPath,
  normalizeProxyPath,
} from "@/lib/api/proxyPolicy";
import {
  loginRequestSchema,
  rawDataSourceSchema,
  registerRequestSchema,
  validated,
} from "@/lib/api/contracts";
import { bffFailure } from "@/lib/api/bff";
import { ApiError as ServerApiError, friendlyMessage } from "@/lib/api/errors";

const originalFetch = globalThis.fetch;

describe("browser API boundary", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("uses the same-origin BFF and never adds an Authorization header", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    await api("/pipelines");

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/proxy/pipelines");
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
    expect(init.credentials).toBe("same-origin");
  });

  it("turns malformed successful JSON into a controlled API error", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("not-json", { status: 200 }),
    );

    await expect(api("/pipelines")).rejects.toMatchObject({
      status: 502,
      code: "invalid_response",
    });
  });

  it("rejects a response that violates its declared contract", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ id: "not-a-number" }), { status: 200 }),
    );

    await expect(
      api("/data-sources/1", {}, validated(rawDataSourceSchema)),
    ).rejects.toMatchObject({ status: 502, code: "invalid_response" });
  });

  it("only retries transient transport and backend failures", () => {
    expect(isRetryableApiError(new ApiError(0, "network_error", "offline"))).toBe(true);
    expect(isRetryableApiError(new ApiError(429, "rate_limited", "slow down"))).toBe(true);
    expect(isRetryableApiError(new ApiError(500, "server", "failed"))).toBe(true);
    expect(isRetryableApiError(new ApiError(400, "invalid", "bad input"))).toBe(false);
    expect(isRetryableApiError(new ApiError(401, "unauth", "expired"))).toBe(false);
  });

  it("never exposes an untranslated backend error in a system alert", () => {
    expect(friendlyMessage(400, "invalid data store configuration")).toBe(
      "No fue posible completar la solicitud. Revisa los datos e inténtalo de nuevo.",
    );
  });
});

describe("BFF allow-list", () => {
  it("exposes the documented browser surface but not internal operations", () => {
    expect(normalizeProxyPath(["pipelines", "12"])).toBe("pipelines/12");
    expect(normalizeProxyPath(["pipelines", ".."])).toBeNull();
    expect(isAllowedProxyPath("pipelines/12")).toBe(true);
    expect(isAllowedProxyPath("admin/users")).toBe(true);
    expect(isAllowedProxyPath("auth/login")).toBe(false);
    expect(isAllowedProxyPath("license/stripe-sync")).toBe(false);
    expect(isAllowedProxyPath("metrics")).toBe(false);
  });

  it("accepts same-origin mutations and rejects cross-origin browser requests", () => {
    expect(hasTrustedOrigin("https://web.example.test/api/auth/login", "https://web.example.test")).toBe(true);
    expect(hasTrustedOrigin("https://web.example.test/api/auth/login", "https://evil.example")).toBe(false);
    expect(hasTrustedOrigin("https://web.example.test/api/auth/login", null)).toBe(true);
  });
});

describe("BFF input contracts", () => {
  it("rejects malformed credentials before forwarding them to the backend", () => {
    expect(loginRequestSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(registerRequestSchema.safeParse({ email: "user@example.test", name: "", password: "short" }).success).toBe(false);
    expect(registerRequestSchema.safeParse({
      email: "user@example.test",
      name: "Usuario",
      password: "correct-password",
    }).success).toBe(true);
  });
});

describe("BFF failures", () => {
  it("converts a transport failure into a valid gateway response", () => {
    const response = bffFailure(new ServerApiError(0, "network_error", "offline"));

    expect(response.status).toBe(502);
  });
});
