import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { retrieveStripeSubscription } from "@/lib/stripe/server";
import { syncStripeSubscriptionToBackend } from "@/lib/stripe/sync";

export const runtime = "nodejs";

function verifyStripeSignature(payload: string, signatureHeader: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("missing STRIPE_WEBHOOK_SECRET");
  if (!signatureHeader) throw new Error("missing Stripe-Signature header");

  let timestamp: string | null = null;
  const signatures: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value ?? null;
    if (key === "v1" && value) signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) throw new Error("invalid Stripe signature header");

  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    throw new Error("Stripe webhook timestamp outside tolerance");
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const valid = signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature, "hex");
    return (
      expectedBuffer.length === signatureBuffer.length &&
      timingSafeEqual(expectedBuffer, signatureBuffer)
    );
  });
  if (!valid) {
    throw new Error("invalid Stripe signature");
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

async function handleStripeEvent(event: Record<string, unknown>, rawPayload: string) {
  const type = typeof event.type === "string" ? event.type : "";
  const data = asRecord(asRecord(event.data).object);

  if (type === "checkout.session.completed") {
    const subscriptionId =
      typeof data.subscription === "string" ? data.subscription : null;
    if (!subscriptionId) return;
    const subscription = await retrieveStripeSubscription(subscriptionId);
    await syncStripeSubscriptionToBackend({
      subscription,
      checkoutSession: data,
      paymentStatus:
        typeof data.payment_status === "string" ? data.payment_status : null,
      event: { id: String(event.id), type, payload: rawPayload },
    });
    return;
  }

  if (
    type === "customer.subscription.created" ||
    type === "customer.subscription.updated" ||
    type === "customer.subscription.deleted"
  ) {
    await syncStripeSubscriptionToBackend({
      subscription: data,
      paymentStatus: null,
      event: { id: String(event.id), type, payload: rawPayload },
    });
    return;
  }

  if (type === "invoice.paid" || type === "invoice.payment_failed") {
    const subscriptionId =
      typeof data.subscription === "string" ? data.subscription : null;
    if (!subscriptionId) return;
    const subscription = await retrieveStripeSubscription(subscriptionId);
    await syncStripeSubscriptionToBackend({
      subscription,
      paymentStatus: type === "invoice.paid" ? "paid" : "failed",
      event: { id: String(event.id), type, payload: rawPayload },
    });
  }
}

export async function POST(req: Request) {
  const rawPayload = await req.text();
  try {
    verifyStripeSignature(rawPayload, req.headers.get("stripe-signature"));
  } catch (e) {
    return NextResponse.json({ error: "invalid Stripe webhook" }, { status: 400 });
  }

  try {
    const event = JSON.parse(rawPayload);
    await handleStripeEvent(event, rawPayload);
    return NextResponse.json({ received: true });
  } catch {
    // Un 5xx hace que Stripe reintente errores transitorios del backend.
    return NextResponse.json({ error: "Stripe webhook processing failed" }, { status: 500 });
  }
}
