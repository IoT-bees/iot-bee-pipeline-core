import { NextResponse } from "next/server";
import { apiAuthed } from "@/lib/api/server";
import type { LicenseStatus } from "@/lib/api/types";
import { createStripePortalSession } from "@/lib/stripe/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const status = await apiAuthed<LicenseStatus>("/license/status");
    if (!status.stripeCustomerId) {
      return NextResponse.json(
        { error: "no Stripe customer for current license" },
        { status: 400 },
      );
    }
    const origin = new URL(req.url).origin;
    const session = await createStripePortalSession({
      customerId: status.stripeCustomerId,
      origin,
    });
    return NextResponse.json(session);
  } catch (e) {
    const message = e instanceof Error ? e.message : "stripe portal failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

