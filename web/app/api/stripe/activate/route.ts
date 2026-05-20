import { NextResponse } from "next/server";
import { getToken } from "@/lib/auth/session";
import {
  retrieveStripeCheckoutSession,
  retrieveStripeSubscription,
} from "@/lib/stripe/server";
import { syncStripeSubscriptionToBackend } from "@/lib/stripe/sync";
import { authApi } from "@/lib/api/endpoints/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "unauth" }, { status: 401 });

  try {
    const { sessionId } = await req.json();
    if (typeof sessionId !== "string") {
      return NextResponse.json({ error: "invalid session" }, { status: 400 });
    }

    const session = await retrieveStripeCheckoutSession(sessionId);
    if (!["paid", "no_payment_required"].includes(session.payment_status)) {
      return NextResponse.json(
        { error: `stripe payment status: ${session.payment_status}` },
        { status: 400 },
      );
    }
    if (!session.subscription) {
      return NextResponse.json({ error: "missing subscription" }, { status: 400 });
    }

    // Verify ownership: the session must reference this caller.
    const me = await authApi.me(token);
    const expectedRef = `org:${me.user.organizationId}`;
    if (session.client_reference_id !== expectedRef) {
      return NextResponse.json(
        { error: "checkout session does not belong to this account" },
        { status: 403 },
      );
    }

    const subscription = await retrieveStripeSubscription(session.subscription);
    const license = await syncStripeSubscriptionToBackend({
      subscription,
      checkoutSession: session,
      paymentStatus: session.payment_status,
    });

    return NextResponse.json({ license, session });
  } catch (e) {
    const message = e instanceof Error ? e.message : "stripe activation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
