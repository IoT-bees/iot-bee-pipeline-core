import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { forbiddenOrigin } from "@/lib/api/bff";
import { hasTrustedOrigin } from "@/lib/api/proxyPolicy";

export async function POST(req: Request) {
  if (!hasTrustedOrigin(req.url, req.headers.get("origin"))) return forbiddenOrigin();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearSessionCookie());
  return res;
}
