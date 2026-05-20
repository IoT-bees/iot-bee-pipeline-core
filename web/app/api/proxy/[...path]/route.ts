import { NextResponse } from "next/server";
import { getToken } from "@/lib/auth/session";

const BASE = process.env.INTERNAL_API_URL ?? "http://localhost:8080";

// Backend endpoints that are intentionally unauthenticated (the page calling
// them has no session yet). Forward without Authorization rather than 401.
const PUBLIC_PATHS = new Set(["auth/has-users", "health"]);

async function forward(req: Request, path: string[]) {
  const joined = path.join("/");
  const token = await getToken();
  if (!token && !PUBLIC_PATHS.has(joined)) {
    return NextResponse.json({ error: "unauth" }, { status: 401 });
  }

  const url = `${BASE}/${joined}${new URL(req.url).search}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const init: RequestInit = {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
  };
  const res = await fetch(url, init);
  const text = await res.text();
  const nullBody = res.status === 204 || res.status === 205 || res.status === 304;

  const respHeaders: Record<string, string> = { "Content-Type": "application/json" };
  // Forward cache hints for safe methods only.
  if (req.method === "GET") {
    const cacheControl = res.headers.get("cache-control");
    if (cacheControl) respHeaders["Cache-Control"] = cacheControl;
    const etag = res.headers.get("etag");
    if (etag) respHeaders["ETag"] = etag;
  }
  return new NextResponse(nullBody ? null : text, { status: res.status, headers: respHeaders });
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
