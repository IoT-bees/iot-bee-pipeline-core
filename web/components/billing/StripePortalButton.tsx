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
      if (!res.ok) throw new Error("No se pudo abrir el portal de facturación.");
      window.location.href = body.url;
    } catch {
      onError("No se pudo abrir el portal de facturación.");
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
      {loading ? "ABRIENDO..." : "GESTIONAR FACTURACIÓN"}
    </Button>
  );
}
