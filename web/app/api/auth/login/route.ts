import { NextResponse } from "next/server";
import { authApi } from "@/lib/api/endpoints/auth";
import { ApiError } from "@/lib/api/client";
import { buildSessionCookie } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const { user, token } = await authApi.login(email, password);
    const res = NextResponse.json({ user });
    res.cookies.set(buildSessionCookie(token));
    return res;
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
