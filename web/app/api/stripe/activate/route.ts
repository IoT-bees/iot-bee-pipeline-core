import { NextResponse } from "next/server";
import { getToken } from "@/lib/auth/session";
import {
  retrieveStripeCheckoutSession,
  retrieveStripeSubscription,
} from "@/lib/stripe/server";
import { syncStripeSubscriptionToBackend } from "@/lib/stripe/sync";
import { apiAuthed } from "@/lib/api/server";
import {
  meResponseSchema,
  stripeActivationRequestSchema,
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

  const parsed = stripeActivationRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidRequest("invalid session");

  try {
    const { sessionId } = parsed.data;

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
    const me = await apiAuthed<MeResponse>("/auth/me", {}, validated(meResponseSchema));
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
    return bffFailure(e, "stripe activation failed");
  }
}
