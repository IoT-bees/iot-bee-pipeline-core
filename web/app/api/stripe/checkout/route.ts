import { NextResponse } from "next/server";
import { getToken } from "@/lib/auth/session";
import { findBillingPlan, type PaidPlan } from "@/lib/billing/plans";
import { createStripeCheckoutSession } from "@/lib/stripe/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "unauth" }, { status: 401 });

  try {
    const { planId } = await req.json();
    const plan = findBillingPlan(planId);
    if (!plan) {
      return NextResponse.json({ error: "invalid plan" }, { status: 400 });
    }
    const origin = new URL(req.url).origin;
    const session = await createStripeCheckoutSession({
      planId: plan.id as PaidPlan,
      origin,
    });
    return NextResponse.json(session);
  } catch (e) {
    const message = e instanceof Error ? e.message : "stripe checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

