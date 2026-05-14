import { NextResponse } from "next/server";
import { getToken } from "@/lib/auth/session";
import { authApi } from "@/lib/api/endpoints/auth";
import { ApiError } from "@/lib/api/client";

export async function GET() {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "unauth" }, { status: 401 });
  try {
    return NextResponse.json(await authApi.me(token));
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "unauth" }, { status: 401 });
  }
}
