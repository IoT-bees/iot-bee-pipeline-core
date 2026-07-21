import { licensePrefixFor } from "@/lib/billing/plans";
import { backendApi } from "@/lib/api/server";

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
  if (status === "active" || status === "trialing") return "active";
  // `past_due` / `unpaid` stay in the `active` bucket so reads keep working;
  // the backend derives `is_restricted` from `stripeSubscriptionStatus` and
  // blocks mutations / shows the banner from there.
  if (status === "past_due" || status === "unpaid") return "active";
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
  const planSlug = metadata?.planId;
  if (!planSlug) throw new Error("missing subscription plan metadata");
  const organizationId = metadata?.organizationId;
  const checkoutReference = checkoutSession?.client_reference_id;
  const clientReferenceId =
    typeof checkoutReference === "string"
      ? checkoutReference
      : organizationId
        ? `org:${organizationId}`
        : null;
  if (!clientReferenceId) throw new Error("missing subscription organization metadata");

  const subscriptionId = asId(subscription.id);
  if (!subscriptionId) throw new Error("missing Stripe subscription id");

  const customerId = asId(subscription.customer);
  const status =
    typeof subscription.status === "string" ? subscription.status : undefined;

  const latestInvoiceId = asId(subscription.latest_invoice);
  const checkoutSessionId = checkoutSession ? asId(checkoutSession.id) : null;
  // Trust the actual amount Stripe is charging, not a local catalog snapshot.
  const items = subscription.items as { data?: unknown[] } | undefined;
  const firstItem = items?.data?.[0] as Record<string, unknown> | undefined;
  const price = firstItem?.price as Record<string, unknown> | undefined;
  const stripeAmount =
    typeof price?.unit_amount === "number" ? price.unit_amount : 0;
  const stripeCurrency =
    typeof price?.currency === "string" ? price.currency : "usd";
  const amountCents = stripeAmount;

  return backendApi("/license/stripe-sync", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SERVICE_ADMIN_TOKEN ?? ""}`,
      "x-stripe-sync-secret": process.env.STRIPE_SYNC_SECRET ?? "",
    },
    body: JSON.stringify({
      licenseKey: licenseKeyFor(licensePrefixFor(planSlug), subscriptionId),
      clientReferenceId,
      plan: planSlug,
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
      currency: stripeCurrency,
      stripeEventId: event?.id,
      eventType: event?.type,
      eventPayload: event?.payload,
    }),
  });
}
