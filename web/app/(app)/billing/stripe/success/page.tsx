"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";

export default function StripeSuccessPage() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const called = useRef(false);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Activando tu plan de iot bees…");

  useEffect(() => {
    if (!sessionId || called.current) return;
    called.current = true;

    async function activate() {
      try {
        const res = await fetch("/api/stripe/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error("No se pudo activar la licencia.");
        setState("success");
        setMessage(`Plan activado: ${body.license.plan}`);
      } catch {
        setState("error");
        setMessage("No se pudo activar la licencia.");
      }
    }

    activate();
  }, [sessionId]);

  if (!sessionId) {
    return (
      <Panel tone="danger" className="max-w-[760px]">
        <div className="t-label mb-2">Sesión de Stripe no encontrada</div>
        <p className="text-[14px] text-[var(--color-fg-3)]">
          Stripe regresó sin un identificador de sesión de pago.
        </p>
      </Panel>
    );
  }

  return (
    <div>
      <h1 className="t-title mb-1">Pago del plan</h1>
      <p className="t-mono mb-6">El pago de capacidad para proyectos fue completado.</p>
      <Panel tone={state === "error" ? "danger" : "accent"} className="max-w-[760px]">
        {state === "loading" ? (
          <HoneycombLoader label="Activando plan" />
        ) : (
          <>
            <div className="t-label mb-2">
              {state === "success" ? "Activado" : "Error"}
            </div>
            <p className="text-[15px] leading-[1.7] text-[var(--color-fg-2)]">
              {message}
            </p>
            <Link href="/billing" className="inline-block mt-5">
              <Button type="button" variant="primary">
                VOLVER A FACTURACIÓN
              </Button>
            </Link>
          </>
        )}
      </Panel>
    </div>
  );
}
