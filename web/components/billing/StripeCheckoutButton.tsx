"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function StripeCheckoutButton({
  planId,
  disabled,
  onError,
}: {
  planId: string;
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
      if (!res.ok) throw new Error("No se pudo iniciar el pago con Stripe.");
      window.location.href = body.url;
    } catch {
      onError("No se pudo iniciar el pago con Stripe.");
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
      {loading ? "REDIRIGIENDO..." : "ACTIVAR PLAN"}
    </Button>
  );
}
