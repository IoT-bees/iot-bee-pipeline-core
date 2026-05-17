"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function StripePortalButton({
  disabled,
  onError,
}: {
  disabled?: boolean;
  onError: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    try {
      setLoading(true);
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "could not open billing portal");
      window.location.href = body.url;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Stripe portal failed";
      onError(message);
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full"
      disabled={disabled || loading}
      onClick={openPortal}
    >
      {loading ? "OPENING..." : "MANAGE BILLING"}
    </Button>
  );
}

