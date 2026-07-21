import { NextResponse } from "next/server";
import { getToken } from "@/lib/auth/session";
import { apiAuthed } from "@/lib/api/server";
import { bffFailure } from "@/lib/api/bff";
import { meResponseSchema, validated } from "@/lib/api/contracts";
import type { MeResponse } from "@/lib/api/types";

export async function GET() {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "unauth", code: "unauth" }, { status: 401 });
  try {
    return NextResponse.json(
      await apiAuthed<MeResponse>("/auth/me", {}, validated(meResponseSchema)),
    );
  } catch (e) {
    return bffFailure(e, "unauthenticated");
  }
}
