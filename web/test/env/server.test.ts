import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env/server";

describe("server environment contract", () => {
  it("normalizes a backend URL and cookie configuration", () => {
    expect(
      parseServerEnv({
        BACKEND_API_URL: "https://api.example.test/",
        BACKEND_API_TIMEOUT_MS: "12000",
        AUTH_COOKIE_NAME: "__Host_iot_bee",
        AUTH_COOKIE_MAX_AGE_HOURS: "12",
        AUTH_COOKIE_SECURE: "1",
      }),
    ).toEqual({
      backendApiUrl: "https://api.example.test",
      backendApiTimeoutMs: 12000,
      authCookieName: "__Host_iot_bee",
      authCookieMaxAgeHours: 12,
      authCookieSecure: "1",
    });
  });

  it("uses the internal backend URL when the BFF runs in Docker", () => {
    expect(parseServerEnv({ INTERNAL_API_URL: "http://iot-bee:8080/" }).backendApiUrl).toBe(
      "http://iot-bee:8080",
    );
  });

  it("prefers the internal Docker URL over a local development fallback", () => {
    expect(
      parseServerEnv({
        BACKEND_API_URL: "http://localhost:8080",
        INTERNAL_API_URL: "http://iot-bee:8080",
      }).backendApiUrl,
    ).toBe("http://iot-bee:8080");
  });

  it("rejects malformed configuration before a server request is made", () => {
    expect(() => parseServerEnv({ BACKEND_API_URL: "not-a-url" })).toThrow();
    expect(() => parseServerEnv({ AUTH_COOKIE_NAME: "bad cookie name" })).toThrow();
  });

  it("requires an HTTPS backend URL in production", () => {
    expect(() => parseServerEnv({ NODE_ENV: "production" })).toThrow(
      "BACKEND_API_URL is required",
    );
    expect(() =>
      parseServerEnv({ NODE_ENV: "production", BACKEND_API_URL: "http://api.example.test" }),
    ).toThrow("must use HTTPS");
  });
});
