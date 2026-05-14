// API client. On the server, hits the backend directly using
// INTERNAL_API_URL. In the browser, routes through /api/proxy/* so the
// HttpOnly session cookie can be translated into an Authorization header
// without exposing the JWT to client-side JS.

const BASE =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL ?? "http://localhost:8080"
    : "/api/proxy";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

type Init = RequestInit & { token?: string };

export async function api<T>(path: string, init: Init = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (init.token) {
    headers.set("Authorization", `Bearer ${init.token}`);
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = body?.error ?? `request failed (${res.status})`;
    throw new ApiError(res.status, body?.code ?? "unknown", message);
  }
  return body as T;
}
