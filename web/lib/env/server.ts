import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  BACKEND_API_URL: z.string().url().optional(),
  INTERNAL_API_URL: z.string().url().optional(),
  BACKEND_API_TIMEOUT_MS: z.coerce.number().int().positive().max(30_000).default(10_000),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  AUTH_COOKIE_NAME: z.string().regex(/^[A-Za-z0-9_-]+$/).default("iot_bee_session"),
  AUTH_COOKIE_MAX_AGE_HOURS: z.coerce.number().finite().positive().max(24 * 365).default(24),
  AUTH_COOKIE_SECURE: z.enum(["0", "1"]).optional(),
});

export type ServerEnv = {
  backendApiUrl: string;
  backendApiTimeoutMs: number;
  authCookieName: string;
  authCookieMaxAgeHours: number;
  authCookieSecure?: "0" | "1";
};

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const env = serverEnvSchema.parse(source);
  const backendApiUrl = env.INTERNAL_API_URL ?? env.BACKEND_API_URL ?? "http://localhost:8080";
  if (!env.BACKEND_API_URL && !env.INTERNAL_API_URL && env.NODE_ENV === "production") {
    throw new Error("BACKEND_API_URL is required in production");
  }
  if (env.NODE_ENV === "production" && !backendApiUrl.startsWith("https://")) {
    throw new Error("BACKEND_API_URL must use HTTPS in production");
  }
  return {
    backendApiUrl: backendApiUrl.replace(/\/$/, ""),
    backendApiTimeoutMs: env.BACKEND_API_TIMEOUT_MS,
    authCookieName: env.AUTH_COOKIE_NAME,
    authCookieMaxAgeHours: env.AUTH_COOKIE_MAX_AGE_HOURS,
    authCookieSecure: env.AUTH_COOKIE_SECURE,
  };
}

export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env);
}
