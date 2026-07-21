import { NextResponse } from "next/server";
import { backendApi } from "@/lib/api/server";
import { bffFailure, forbiddenOrigin, invalidRequest } from "@/lib/api/bff";
import { authResponseSchema, registerRequestSchema, validated } from "@/lib/api/contracts";
import type { AuthResponse } from "@/lib/api/types";
import { buildSessionCookie } from "@/lib/auth/session";
import { hasTrustedOrigin } from "@/lib/api/proxyPolicy";

export async function POST(req: Request) {
  if (!hasTrustedOrigin(req.url, req.headers.get("origin"))) return forbiddenOrigin();
  const parsed = registerRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidRequest();
  try {
    const { email, name, password } = parsed.data;
    const { user, token } = await backendApi<AuthResponse>(
      "/auth/register",
      { method: "POST", body: JSON.stringify({ email, name, password }) },
      validated(authResponseSchema),
    );
    const res = NextResponse.json({ user }, { status: 201 });
    res.cookies.set(buildSessionCookie(token));
    return res;
  } catch (e) {
    return bffFailure(e);
  }
}
