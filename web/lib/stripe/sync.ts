import { findBillingPlan } from "@/lib/billing/plans";

const BACKEND_BASE = process.env.INTERNAL_API_URL ?? "http://localhost:8080";

function asId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

function isoFromUnix(value: unknown): string | null {
  if (typeof value !== "number") return null;
  return new Date(value * 1000).toISOString();
}

function currentPeriodEndFromSubscription(subscription: Record<string, unknown>) {
  const subscriptionPeriodEnd = isoFromUnix(subscription.current_period_end);
  if (subscriptionPeriodEnd) return subscriptionPeriodEnd;

  const items = subscription.items as { data?: unknown[] } | undefined;
  const itemPeriodEnd = items?.data
    ?.map((item) =>
      item && typeof item === "object"
        ? isoFromUnix((item as Record<string, unknown>).current_period_end)
        : null,
    )
    .find(Boolean);

  return itemPeriodEnd ?? null;
}

function accessStateFromStripe(status: string | undefined) {
  if (status === "active" || status === "trialing" || status === "past_due") {
    return "active";
  }
  return "inactive";
}

export function licenseKeyFor(planPrefix: string, stripeId: string) {
  const suffix = stripeId.replace(/[^a-z0-9]/gi, "").slice(-10).toUpperCase();
  return `${planPrefix}-STRIPE-${suffix}`;
}

export async function syncStripeSubscriptionToBackend({
  subscription,
  checkoutSession,
  paymentStatus,
  event,
}: {
  subscription: Record<string, unknown>;
  checkoutSession?: Record<string, unknown>;
  paymentStatus?: string | null;
  event?: { id: string; type: string; payload: string };
}) {
  const metadata = subscription.metadata as Record<string, string> | undefined;
  const plan = findBillingPlan(metadata?.planId ?? "");
  if (!plan) throw new Error("missing subscription plan metadata");

  const subscriptionId = asId(subscription.id);
  if (!subscriptionId) throw new Error("missing Stripe subscription id");

  const customerId = asId(subscription.customer);
  const status =
    typeof subscription.status === "string" ? subscription.status : undefined;

  const latestInvoiceId = asId(subscription.latest_invoice);
  const checkoutSessionId = checkoutSession ? asId(checkoutSession.id) : null;
  const amountCents = Math.round(Number(plan.priceUsd) * 100);

  const res = await fetch(`${BACKEND_BASE}/internal/stripe/license-sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-stripe-sync-secret": process.env.STRIPE_SYNC_SECRET ?? "",
    },
    body: JSON.stringify({
      licenseKey: licenseKeyFor(plan.licensePrefix, subscriptionId),
      plan: plan.id,
      state: accessStateFromStripe(status),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripeCheckoutSessionId: checkoutSessionId,
      stripeSubscriptionStatus: status,
      stripePaymentStatus: paymentStatus ?? null,
      currentPeriodEnd: currentPeriodEndFromSubscription(subscription),
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      latestInvoiceId,
      amountCents,
      currency: "usd",
      stripeEventId: event?.id,
      eventType: event?.type,
      eventPayload: event?.payload,
    }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error ?? "backend stripe sync failed");
  }
  return body;
}
