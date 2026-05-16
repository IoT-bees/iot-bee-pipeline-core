"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

export default function StripeSuccessPage() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const called = useRef(false);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Activating your iot-bee license...");

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
        if (!res.ok) throw new Error(body?.error ?? "license activation failed");
        setState("success");
        setMessage(`License activated: ${body.license.plan}`);
      } catch (e) {
        setState("error");
        setMessage(e instanceof Error ? e.message : "license activation failed");
      }
    }

    activate();
  }, [sessionId]);

  if (!sessionId) {
    return (
      <Panel tone="danger" className="max-w-[760px]">
        <div className="t-label mb-2">{"// "}missing stripe session</div>
        <p className="text-[14px] text-[var(--color-fg-3)]">
          Stripe returned without a checkout session id.
        </p>
      </Panel>
    );
  }

  return (
    <div>
      <h1 className="t-title mb-1">stripe checkout</h1>
      <p className="t-mono mb-6">{"// "}test payment completed</p>
      <Panel tone={state === "error" ? "danger" : "accent"} className="max-w-[760px]">
        <div className="t-label mb-2">
          {"// "}{state === "loading" ? "activating" : state}
        </div>
        <p className="text-[15px] leading-[1.7] text-[var(--color-fg-2)]">
          {message}
        </p>
        <Link href="/billing" className="inline-block mt-5">
          <Button type="button" variant="primary">
            BACK TO BILLING
          </Button>
        </Link>
      </Panel>
    </div>
  );
}

