import { findBillingPlan, type PaidPlan } from "@/lib/billing/plans";

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
  planId,
  origin,
}: {
  planId: PaidPlan;
  origin: string;
}): Promise<{ id: string; url: string }> {
  const plan = findBillingPlan(planId);
  if (!plan) throw new Error("unknown billing plan");

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
      client_reference_id: "iot-bee-single-admin",
      "metadata[planId]": plan.id,
      "subscription_data[metadata][planId]": plan.id,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(
        Math.round(Number(plan.priceUsd) * 100),
      ),
      "line_items[0][price_data][recurring][interval]": "month",
      "line_items[0][price_data][product_data][name]": `iot-bee ${plan.name}`,
      "line_items[0][price_data][product_data][description]": plan.description,
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
