import { NextResponse } from "next/server";
import { apiAuthed } from "@/lib/api/server";
import type { LicenseStatus } from "@/lib/api/types";
import { retrieveStripeSubscription } from "@/lib/stripe/server";
import { syncStripeSubscriptionToBackend } from "@/lib/stripe/sync";

export const runtime = "nodejs";

export async function POST() {
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
    const message = e instanceof Error ? e.message : "stripe refresh failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
