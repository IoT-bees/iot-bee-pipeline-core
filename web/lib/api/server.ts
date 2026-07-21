import "server-only";
import { getToken } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env/server";
import { requestJson, type ResponseValidator } from "./request";

export async function backendApi<T>(
  path: string,
  init: RequestInit = {},
  validate?: ResponseValidator<T>,
): Promise<T> {
  const { backendApiUrl, backendApiTimeoutMs } = getServerEnv();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return requestJson(
    `${backendApiUrl}${path}`,
    { ...init, headers, cache: "no-store", signal: init.signal ?? AbortSignal.timeout(backendApiTimeoutMs) },
    validate,
  );
}

export async function apiAuthed<T>(
  path: string,
  init: RequestInit = {},
  validate?: ResponseValidator<T>,
): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error("unauthenticated");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return backendApi(path, { ...init, headers }, validate);
}

export async function serverFetch<T>(
  path: string,
  init?: { revalidate?: number; tag?: string },
): Promise<T> {
  // User-scoped responses must not enter Next's shared fetch cache. The
  // parameter remains for compatibility with existing server components.
  void init;
  return apiAuthed<T>(path);
}
