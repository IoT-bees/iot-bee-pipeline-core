import { NextResponse } from "next/server";
import { getToken } from "@/lib/auth/session";

const BASE = process.env.INTERNAL_API_URL ?? "http://localhost:8080";

async function forward(req: Request, path: string[]) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "unauth" }, { status: 401 });
  }
  const url = `${BASE}/${path.join("/")}${new URL(req.url).search}`;
  const init: RequestInit = {
    method: req.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
  };
  const res = await fetch(url, init);
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
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
