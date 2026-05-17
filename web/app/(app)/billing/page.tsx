"use client";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { StripeCheckoutButton } from "@/components/billing/StripeCheckoutButton";
import { StripePortalButton } from "@/components/billing/StripePortalButton";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import {
  useActivateLicense,
  useDeactivateLicense,
  useLicenseStatus,
} from "@/lib/hooks/useLicense";
import { useBillingPlans } from "@/lib/hooks/useBillingPlans";
import { useToasts } from "@/lib/store/useToasts";
import type { Plan } from "@/lib/api/types";

function yesNo(value: boolean) {
  return value ? "yes" : "no";
}

function FeatureLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#242424] py-2 text-[12px]">
      <span className="text-[var(--color-fg-3)]">{label}</span>
      <span className="font-mono font-bold text-[var(--color-fg-1)] text-right">
        {value}
      </span>
    </div>
  );
}

function fmtDate(value: string | null) {
  if (!value) return "not set";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

export default function BillingPage() {
  const { data, error, isError, isPending, refetch } = useLicenseStatus();
  const plansQuery = useBillingPlans();
  const activate = useActivateLicense();
  const deactivate = useDeactivateLicense();
  const push = useToasts((s) => s.push);
  const [licenseKey, setLicenseKey] = useState("");
  const [showUpgradePlans, setShowUpgradePlans] = useState(false);
  const [refreshAttempted, setRefreshAttempted] = useState(false);
  const [refreshingBilling, setRefreshingBilling] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await activate.mutateAsync(licenseKey);
    setLicenseKey("");
  }

  useEffect(() => {
    if (
      !data?.stripeSubscriptionId ||
      data.currentPeriodEnd ||
      refreshAttempted
    ) {
      return;
    }

    setRefreshAttempted(true);
    setRefreshingBilling(true);
    fetch("/api/stripe/refresh", { method: "POST" })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? "billing refresh failed");
      })
      .then(() => refetch())
      .catch((e) => {
        const message =
          e instanceof Error ? e.message : "billing refresh failed";
        push({ kind: "error", message });
      })
      .finally(() => setRefreshingBilling(false));
  }, [
    data?.currentPeriodEnd,
    data?.stripeSubscriptionId,
    refreshAttempted,
    refetch,
    push,
  ]);

  if (isPending) return <div className="t-mono">{"// "}loading billing...</div>;
  if (isError || !data) {
    return (
      <div>
        <h1 className="t-title mb-1">billing</h1>
        <p className="t-mono mb-6">
          {"// "}subscription status could not be loaded.
        </p>
        <Panel tone="danger" className="max-w-[760px]">
          <div className="t-label mb-2">{"// "}billing api unavailable</div>
          <p className="text-[14px] leading-[1.7] text-[var(--color-fg-3)]">
            The web app could not read{" "}
            <span className="font-mono text-[var(--color-fg-1)]">
              /license/status
            </span>
            . If the backend was just rebuilt, retry this request or refresh the
            page so the browser drops the previous failed response.
          </p>
          {error instanceof Error && (
            <div className="mt-4 border border-[#333] bg-[var(--color-bg-elev)] p-3 rounded-[2px] text-[12px] font-mono text-[var(--color-fg-2)]">
              {error.message}
            </div>
          )}
          <Button
            type="button"
            variant="primary"
            className="mt-5"
            onClick={() => refetch()}
          >
            RETRY
          </Button>
        </Panel>
      </div>
    );
  }

  const pipelinePct = Math.min(
    100,
    Math.round((data.usage.pipelines / data.limits.maxPipelines) * 100),
  );
  const subscribablePlans: Plan[] = (plansQuery.data?.items ?? [])
    .filter((p) => p.slug !== "free")
    .sort((a, b) => a.priceCents - b.priceCents);
  const currentPlanIndex = subscribablePlans.findIndex(
    (plan) => plan.slug === data.plan,
  );
  const hasActivePaidPlan = data.state === "active" && currentPlanIndex >= 0;
  const availablePlans = hasActivePaidPlan
    ? subscribablePlans.slice(currentPlanIndex + 1)
    : subscribablePlans;
  const shouldShowPlanCards = !hasActivePaidPlan || showUpgradePlans;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <h1 className="t-title">billing</h1>
        <Pill state={data.state === "active" ? "running" : "idle"}>
          {data.plan.toUpperCase()} / {data.state.toUpperCase()}
        </Pill>
      </div>
      <p className="t-mono mb-6">
        {"// "}manual license activation for the subscription MVP.
      </p>

      <div className="grid lg:grid-cols-[1fr_420px] gap-5">
        <section className="flex flex-col gap-5">
          <Panel tone={data.state === "active" ? "accent" : "default"}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="t-label mb-2">
                  {"// "}current plan / subscription
                </div>
                <div className="text-[34px] font-mono font-bold tracking-[-1px] text-[var(--color-fg-0)]">
                  {data.plan}
                </div>
              </div>
              <div className="text-right">
                <div className="t-label mb-2">status</div>
                <div className="font-mono text-[18px] font-bold text-[var(--color-fg-0)]">
                  {data.stripeSubscriptionStatus ?? data.state}
                </div>
                <div className="text-[12px] text-[var(--color-fg-3)] mt-1">
                  Payment: {data.stripePaymentStatus ?? "none"}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-4 gap-3 mt-5">
              <div>
                <div className="t-label">license</div>
                <div className="font-mono text-[14px] mt-1">
                  {data.licenseKeyLast4
                    ? `ends ${data.licenseKeyLast4}`
                    : "free tier"}
                </div>
              </div>
              <div>
                <div className="t-label">activated</div>
                <div className="font-mono text-[14px] mt-1">
                  {fmtDate(data.activatedAt)}
                </div>
              </div>
              <div>
                <div className="t-label">expires</div>
                <div className="font-mono text-[14px] mt-1">
                  {fmtDate(data.expiresAt)}
                </div>
              </div>
              <div>
                <div className="t-label">renewal</div>
                <div className="font-mono text-[14px] mt-1">
                  {refreshingBilling
                    ? "refreshing..."
                    : fmtDate(data.currentPeriodEnd)}
                </div>
              </div>
            </div>

            {(data.cancelAtPeriodEnd ||
              data.amountCents ||
              data.latestInvoiceId) && (
              <div className="mt-5 border-t border-[#242424] pt-4 text-[13px] leading-[1.7] text-[var(--color-fg-3)]">
                {data.amountCents && data.currency && (
                  <span>
                    Last amount: {(data.amountCents / 100).toFixed(2)}{" "}
                    {data.currency.toUpperCase()}
                  </span>
                )}
                {data.cancelAtPeriodEnd && (
                  <span>
                    {data.amountCents && data.currency ? " · " : ""}
                    cancels at period end
                  </span>
                )}
                {data.latestInvoiceId && (
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    <a
                      href="/api/stripe/invoice"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center font-mono tracking-[1px] rounded-[2px] transition-colors text-[12px] px-3 py-[6px] bg-transparent text-[var(--color-fg-1)] border border-[#333] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    >
                      DOWNLOAD INVOICE
                    </a>
                    <span className="text-[12px] font-mono text-[var(--color-fg-4)]">
                      {data.latestInvoiceId}
                    </span>
                  </div>
                )}
              </div>
            )}
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="t-label">{"// "}pipeline usage</div>
                <div className="font-mono text-[14px] mt-1">
                  {data.usage.pipelines} / {data.limits.maxPipelines} pipelines
                </div>
              </div>
              <div className="font-mono text-[22px] font-bold text-[var(--color-accent)]">
                {pipelinePct}%
              </div>
            </div>
            <div className="h-2 bg-[var(--color-bg-elev)] border border-[#222]">
              <div
                className="h-full bg-[var(--color-accent)]"
                style={{ width: `${pipelinePct}%` }}
              />
            </div>
          </Panel>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Panel>
              <div className="t-label">max replicas</div>
              <div className="t-title mt-1">
                {data.limits.maxReplicasPerPipeline}
              </div>
            </Panel>
            <Panel>
              <div className="t-label">alerts</div>
              <div className="font-mono text-[20px] font-bold mt-2">
                {yesNo(data.limits.alertsEnabled)}
              </div>
            </Panel>
            <Panel>
              <div className="t-label">premium connectors</div>
              <div className="font-mono text-[20px] font-bold mt-2">
                {yesNo(data.limits.premiumConnectors)}
              </div>
            </Panel>
            <Panel>
              <div className="t-label">multi-user</div>
              <div className="font-mono text-[20px] font-bold mt-2">
                {yesNo(data.limits.multiUser)}
              </div>
            </Panel>
          </div>

          <Panel tone="accent">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div>
                <div className="t-label mb-2">
                  {"// "}
                  {hasActivePaidPlan
                    ? "upgrade options"
                    : "stripe test checkout"}
                </div>
                <p className="text-[13px] leading-[1.6] text-[var(--color-fg-3)]">
                  {hasActivePaidPlan
                    ? `You already have ${data.plan.toUpperCase()} active. Higher plans stay hidden unless you want to upgrade.`
                    : "Test subscription payments with Stripe Checkout. A successful capture generates and activates a local iot-bee license for the selected plan."}
                </p>
              </div>
              {hasActivePaidPlan && availablePlans.length > 0 && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setShowUpgradePlans((value) => !value)}
                >
                  {showUpgradePlans ? "HIDE UPGRADES" : "SHOW UPGRADES"}
                </Button>
              )}
            </div>

            {hasActivePaidPlan && availablePlans.length === 0 && (
              <div className="border border-[#262626] bg-[var(--color-bg-elev)] rounded-[3px] p-4 text-[13px] leading-[1.6] text-[var(--color-fg-3)]">
                You are already on the highest MVP plan. Manage billing from
                the right rail if you need to update payment details or cancel.
              </div>
            )}

            {shouldShowPlanCards && availablePlans.length > 0 && (
              <div
                className={
                  hasActivePaidPlan
                    ? "grid md:grid-cols-2 gap-4"
                    : "grid md:grid-cols-3 gap-4"
                }
              >
                {availablePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="border border-[#262626] bg-[var(--color-bg-elev)] rounded-[3px] p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="font-mono font-bold text-[18px] text-[var(--color-fg-0)]">
                          {plan.displayName}
                          {plan.organizationId != null && (
                            <span className="ml-2 text-[10px] tracking-[1.5px] uppercase text-[var(--color-accent)]">
                              custom
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] text-[var(--color-fg-3)]">
                          {plan.description ?? ""}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-[var(--color-accent)]">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: plan.currency,
                          maximumFractionDigits: 0,
                        }).format(plan.priceCents / 100)}
                        <span className="text-[11px] text-[var(--color-fg-4)] font-normal">
                          {" "}/ month
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 mb-4">
                      <FeatureLine
                        label="Pipelines"
                        value={`${plan.maxPipelines}`}
                      />
                      <FeatureLine
                        label="Replicas per pipeline"
                        value={`${plan.maxReplicasPerPipeline}`}
                      />
                      <FeatureLine
                        label="Alerts"
                        value={yesNo(plan.alertsEnabled)}
                      />
                      <FeatureLine
                        label="Premium connectors"
                        value={yesNo(plan.premiumConnectors)}
                      />
                      <FeatureLine
                        label="Multi-user"
                        value={yesNo(plan.multiUser)}
                      />
                    </div>
                    <StripeCheckoutButton
                      planId={plan.slug}
                      onError={(message) => push({ kind: "error", message })}
                    />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>

        <aside className="flex flex-col gap-5">
          <Panel tone="accent">
            <div className="t-label mb-2">{"// "}manual activation</div>
            <p className="text-[13px] leading-[1.6] text-[var(--color-fg-3)] mb-4">
              Developer fallback for pilots and support. Use keys like{" "}
              <span className="font-mono text-[var(--color-fg-1)]">
                IOTBEE-PRO-CLIENT01
              </span>
              . Customer subscriptions should use Stripe checkout above.
            </p>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <Input
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="IOTBEE-PRO-CLIENT01"
                autoComplete="off"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={activate.isPending || licenseKey.trim().length === 0}
              >
                ACTIVATE
              </Button>
            </form>
          </Panel>

          <Panel>
            <div className="t-label mb-2">{"// "}supported MVP keys</div>
            <div className="font-mono text-[12px] text-[var(--color-fg-2)] leading-[1.8]">
              IOTBEE-STARTER-*
              <br />
              IOTBEE-PRO-*
              <br />
              IOTBEE-ENTERPRISE-*
            </div>
            <div className="mt-4">
              <StripePortalButton
                disabled={!data.stripeCustomerId}
                onError={(message) => push({ kind: "error", message })}
              />
            </div>
            <Button
              type="button"
              variant="danger"
              className="mt-4 w-full"
              disabled={deactivate.isPending || data.state !== "active"}
              onClick={() => deactivate.mutate()}
            >
              DEACTIVATE LICENSE
            </Button>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
