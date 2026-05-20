import { NextResponse } from "next/server";
import { getToken } from "@/lib/auth/session";
import { fetchPlanBySlug } from "@/lib/billing/plans";
import { createStripeCheckoutSession } from "@/lib/stripe/server";
import { authApi } from "@/lib/api/endpoints/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "unauth" }, { status: 401 });

  try {
    const { planId } = await req.json();
    const plan = await fetchPlanBySlug(planId, token);
    if (!plan) {
      return NextResponse.json({ error: "invalid plan" }, { status: 400 });
    }
    const me = await authApi.me(token);
    const origin = new URL(req.url).origin;
    const session = await createStripeCheckoutSession({
      plan,
      origin,
      orgId: me.user.organizationId,
    });
    return NextResponse.json(session);
  } catch (e) {
    const message = e instanceof Error ? e.message : "stripe checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
