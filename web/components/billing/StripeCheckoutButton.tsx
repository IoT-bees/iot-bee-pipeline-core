"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { PaidPlan } from "@/lib/billing/plans";

export function StripeCheckoutButton({
  planId,
  disabled,
  onError,
}: {
  planId: PaidPlan;
  disabled?: boolean;
  onError: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    try {
      setLoading(true);
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "could not start Stripe checkout");
      window.location.href = body.url;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Stripe checkout failed";
      onError(message);
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="primary"
      className="w-full mt-3"
      disabled={disabled || loading}
      onClick={startCheckout}
    >
      {loading ? "REDIRECTING..." : "SUBSCRIBE WITH STRIPE"}
    </Button>
  );
}
