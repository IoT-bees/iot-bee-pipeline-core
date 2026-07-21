// Browser-facing API client. It deliberately has no backend URL or token
// parameter: every authenticated browser request goes through the same-origin
// BFF route, where the HttpOnly session cookie is translated server-side.
import { requestJson, type ResponseValidator } from "./request";
import { ApiError } from "./errors";

const BASE = "/api/proxy";

export { ApiError, isRetryableApiError } from "./errors";

export async function api<T>(
  path: string,
  init: RequestInit = {},
  validate?: ResponseValidator<T>,
): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("API paths must be relative and start with a single slash");
  }
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return requestJson(`${BASE}${path}`, { ...init, headers, credentials: "same-origin" }, validate);
}

// DELETE is idempotent per HTTP: a 404 on a resource we asked to delete
// means it is already gone, which is success from the caller's POV.
export async function idempotentDelete<T>(
  p: Promise<T>,
): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}
