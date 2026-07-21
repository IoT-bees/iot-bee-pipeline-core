import { NextResponse } from "next/server";
import { getToken } from "@/lib/auth/session";
import { fetchPlanBySlug } from "@/lib/billing/plans";
import { createStripeCheckoutSession } from "@/lib/stripe/server";
import { apiAuthed } from "@/lib/api/server";
import {
  meResponseSchema,
  stripeCheckoutRequestSchema,
  validated,
} from "@/lib/api/contracts";
import type { MeResponse } from "@/lib/api/types";
import { bffFailure, forbiddenOrigin, invalidRequest } from "@/lib/api/bff";
import { hasTrustedOrigin } from "@/lib/api/proxyPolicy";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!hasTrustedOrigin(req.url, req.headers.get("origin"))) return forbiddenOrigin();
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "unauth", code: "unauth" }, { status: 401 });

  const parsed = stripeCheckoutRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidRequest("invalid plan");

  try {
    const { planId } = parsed.data;
    const plan = await fetchPlanBySlug(planId);
    if (!plan) {
      return NextResponse.json({ error: "invalid plan" }, { status: 400 });
    }
    const me = await apiAuthed<MeResponse>("/auth/me", {}, validated(meResponseSchema));
    const origin = new URL(req.url).origin;
    const session = await createStripeCheckoutSession({
      plan,
      origin,
      orgId: me.user.organizationId,
    });
    return NextResponse.json(session);
  } catch (e) {
    return bffFailure(e, "stripe checkout failed");
  }
}
