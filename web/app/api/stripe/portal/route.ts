import { NextResponse } from "next/server";
import { apiAuthed } from "@/lib/api/server";
import type { LicenseStatus } from "@/lib/api/types";
import { createStripePortalSession } from "@/lib/stripe/server";
import { bffFailure, forbiddenOrigin } from "@/lib/api/bff";
import { hasTrustedOrigin } from "@/lib/api/proxyPolicy";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!hasTrustedOrigin(req.url, req.headers.get("origin"))) return forbiddenOrigin();
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
    return bffFailure(e, "stripe portal failed");
  }
}
