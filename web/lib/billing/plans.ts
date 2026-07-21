// Plans are managed in the iot-bee backend (see /admin/billing). This file
// only keeps the type alias and a helper to fetch a plan by slug from the
// backend with the current user's bearer token — used by server-side Stripe
// integration so the catalog stays consistent with what the admin configured.

import type { Plan } from "@/lib/api/types";
import { apiAuthed } from "@/lib/api/server";

export type PaidPlan = string;

export function licensePrefixFor(slug: string): string {
  return `IOTBEE-${slug.toUpperCase()}`;
}

export async function fetchPlanBySlug(
  slug: string,
): Promise<Plan | null> {
  const body = await apiAuthed<{ items: Plan[] }>("/plans");
  return body.items.find((p) => p.slug === slug) ?? null;
}
