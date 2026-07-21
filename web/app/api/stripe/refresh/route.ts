import { NextResponse } from "next/server";
import { apiAuthed } from "@/lib/api/server";
import type { LicenseStatus } from "@/lib/api/types";
import { retrieveStripeSubscription } from "@/lib/stripe/server";
import { syncStripeSubscriptionToBackend } from "@/lib/stripe/sync";
import { bffFailure, forbiddenOrigin } from "@/lib/api/bff";
import { hasTrustedOrigin } from "@/lib/api/proxyPolicy";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!hasTrustedOrigin(req.url, req.headers.get("origin"))) return forbiddenOrigin();
  try {
    const status = await apiAuthed<LicenseStatus>("/license/status");
    if (!status.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "no Stripe subscription for current license" },
        { status: 400 },
      );
    }

    const subscription = await retrieveStripeSubscription(
      status.stripeSubscriptionId,
    );
    const license = await syncStripeSubscriptionToBackend({
      subscription,
      paymentStatus: status.stripePaymentStatus,
    });

    return NextResponse.json({ license });
  } catch (e) {
    return bffFailure(e, "stripe refresh failed");
  }
}
