import type { Plan } from "@/lib/api/types";

const STRIPE_BASE = "https://api.stripe.com";

function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("missing STRIPE_SECRET_KEY");
  return secretKey;
}

function formBody(entries: Record<string, string>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    body.append(key, value);
  }
  return body;
}

export async function createStripeCheckoutSession({
  plan,
  origin,
  orgId,
}: {
  plan: Plan;
  origin: string;
  orgId: number;
}): Promise<{ id: string; url: string }> {
  // Prefer the catalog's `stripe_price_id` so the resulting subscription
  // attaches to a reusable Stripe Price. That is what unlocks "Change plan"
  // and proration in the Stripe Customer Portal. Falling back to `price_data`
  // creates an anonymous price that the portal cannot manage.
  const lineItem: Record<string, string> = plan.stripePriceId
    ? {
        "line_items[0][price]": plan.stripePriceId,
        "line_items[0][quantity]": "1",
      }
    : {
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": plan.currency.toLowerCase(),
        "line_items[0][price_data][unit_amount]": String(plan.priceCents),
        "line_items[0][price_data][recurring][interval]": "month",
        "line_items[0][price_data][product_data][name]": `iot bees ${plan.displayName}`,
        "line_items[0][price_data][product_data][description]":
          plan.description ?? plan.displayName,
      };

  const res = await fetch(`${STRIPE_BASE}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody({
      mode: "subscription",
      success_url: `${origin}/billing/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing`,
      client_reference_id: `org:${orgId}`,
      "metadata[planId]": plan.slug,
      "subscription_data[metadata][planId]": plan.slug,
      ...lineItem,
    }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Stripe checkout session failed");
  }
  return { id: body.id, url: body.url };
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  const res = await fetch(
    `${STRIPE_BASE}/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    {
      headers: {
        Authorization: `Bearer ${getStripeSecretKey()}`,
      },
    },
  );
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Stripe session lookup failed");
  }
  return body;
}

export async function retrieveStripeSubscription(subscriptionId: string) {
  const res = await fetch(
    `${STRIPE_BASE}/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      headers: {
        Authorization: `Bearer ${getStripeSecretKey()}`,
      },
    },
  );
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Stripe subscription lookup failed");
  }
  return body;
}

export async function retrieveStripeInvoice(invoiceId: string) {
  const res = await fetch(
    `${STRIPE_BASE}/v1/invoices/${encodeURIComponent(invoiceId)}`,
    {
      headers: {
        Authorization: `Bearer ${getStripeSecretKey()}`,
      },
    },
  );
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Stripe invoice lookup failed");
  }
  return body;
}

export async function createStripePortalSession({
  customerId,
  origin,
}: {
  customerId: string;
  origin: string;
}): Promise<{ url: string }> {
  const res = await fetch(`${STRIPE_BASE}/v1/billing_portal/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody({
      customer: customerId,
      return_url: `${origin}/billing`,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Stripe customer portal failed");
  }
  return { url: body.url };
}
