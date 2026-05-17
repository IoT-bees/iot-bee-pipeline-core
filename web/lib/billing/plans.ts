// Plans are managed in the iot-bee backend (see /admin/billing). This file
// only keeps the type alias and a helper to fetch a plan by slug from the
// backend with the current user's bearer token — used by server-side Stripe
// integration so the catalog stays consistent with what the admin configured.

import type { Plan } from "@/lib/api/types";

export type PaidPlan = string;

const BACKEND_BASE = process.env.INTERNAL_API_URL ?? "http://localhost:8080";

export function licensePrefixFor(slug: string): string {
  return `IOTBEE-${slug.toUpperCase()}`;
}

export async function fetchPlanBySlug(
  slug: string,
  token: string,
): Promise<Plan | null> {
  const res = await fetch(`${BACKEND_BASE}/plans`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { items: Plan[] };
  return body.items.find((p) => p.slug === slug) ?? null;
}
