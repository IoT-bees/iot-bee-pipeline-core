import { NextResponse } from "next/server";
import { getToken } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env/server";
import {
  hasTrustedOrigin,
  isAllowedProxyPath,
  normalizeProxyPath,
} from "@/lib/api/proxyPolicy";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function forward(req: Request, path: string[]) {
  const joined = normalizeProxyPath(path);
  if (!joined || !isAllowedProxyPath(joined)) {
    return NextResponse.json({ error: "endpoint not exposed by the web gateway" }, { status: 404 });
  }
  if (UNSAFE_METHODS.has(req.method) && !hasTrustedOrigin(req.url, req.headers.get("origin"))) {
    return NextResponse.json({ error: "untrusted request origin" }, { status: 403 });
  }

  const token = await getToken();
  if (!token && joined !== "auth/has-users" && joined !== "health") {
    return NextResponse.json({ error: "unauth" }, { status: 401 });
  }

  const { backendApiUrl, backendApiTimeoutMs } = getServerEnv();
  const url = `${backendApiUrl}/${joined}${new URL(req.url).search}`;
  const headers = new Headers({ Accept: "application/json" });
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const init: RequestInit = {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
    cache: "no-store",
    signal: AbortSignal.timeout(backendApiTimeoutMs),
  };
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      {
        error: timedOut ? "backend timed out" : "backend unavailable",
        code: timedOut ? "backend_timeout" : "backend_unavailable",
      },
      { status: timedOut ? 504 : 502 },
    );
  }
  const body = await res.arrayBuffer();
  const nullBody = res.status === 204 || res.status === 205 || res.status === 304;

  const respHeaders = new Headers({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    Vary: "Cookie",
  });
  for (const name of ["content-type", "content-disposition", "etag", "x-request-id"]) {
    const value = res.headers.get(name);
    if (value) respHeaders.set(name, value);
  }
  return new NextResponse(nullBody ? null : body, { status: res.status, headers: respHeaders });
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path);
}

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path);
}

export async function PUT(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path);
}

export async function HEAD(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path);
}
