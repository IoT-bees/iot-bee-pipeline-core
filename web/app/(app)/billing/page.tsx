"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StripeCheckoutButton } from "@/components/billing/StripeCheckoutButton";
import { StripePortalButton } from "@/components/billing/StripePortalButton";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import {
  useActivateLicense,
  useDeactivateLicense,
  useLicenseStatus,
} from "@/lib/hooks/useLicense";
import { useBillingPlans } from "@/lib/hooks/useBillingPlans";
import { useToasts } from "@/lib/store/useToasts";
import type { Plan } from "@/lib/api/types";
import { usageApi } from "@/lib/api/endpoints/usage";

function yesNo(value: boolean) {
  return value ? "sí" : "no";
}

function FeatureLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] py-2 text-[12px]">
      <span className="text-[var(--color-fg-3)]">{label}</span>
      <span className="font-mono font-bold text-[var(--color-fg-1)] text-right">
        {value}
      </span>
    </div>
  );
}

function fmtDate(value: string | null) {
  if (!value) return "Sin definir";
  return new Intl.DateTimeFormat("es-419", {
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
  const usageQuery = useQuery({ queryKey: ["usage", "current"], queryFn: usageApi.current });
  const push = useToasts((s) => s.push);
  const [licenseKey, setLicenseKey] = useState("");
  const [showUpgradePlans, setShowUpgradePlans] = useState(false);
  const [refreshAttempted, setRefreshAttempted] = useState(false);
  const [refreshingBilling, setRefreshingBilling] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  async function openCustomerPortal() {
    try {
      setOpeningPortal(true);
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error("No se pudo abrir el portal de facturación.");
      window.location.href = body.url;
    } catch {
      push({ kind: "error", message: "No se pudo abrir el portal de facturación." });
      setOpeningPortal(false);
    }
  }

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
        if (!res.ok) throw new Error("No se pudo actualizar la facturación.");
      })
      .then(() => refetch())
      .catch(() => {
        push({ kind: "error", message: "No se pudo actualizar la facturación." });
      })
      .finally(() => setRefreshingBilling(false));
  }, [
    data?.currentPeriodEnd,
    data?.stripeSubscriptionId,
    refreshAttempted,
    refetch,
    push,
  ]);

  if (isPending) return <HoneycombLoader label="Cargando facturación" />;
  if (isError || !data) {
    return (
      <div>
        <h1 className="t-title mb-1">Tu plan y pagos</h1>
        <p className="t-mono mb-6">
          No fue posible cargar la capacidad de tus proyectos.
        </p>
        <Panel tone="danger" className="max-w-[760px]">
          <div className="t-label mb-2">Servicio de licencia no disponible</div>
          <p className="text-[14px] leading-[1.7] text-[var(--color-fg-3)]">
            La aplicación no pudo consultar{" "}
            <span className="font-mono text-[var(--color-fg-1)]">
              /license/status
            </span>
            . Si el backend se acaba de reiniciar, vuelve a intentarlo o actualiza la página.
          </p>
          {error instanceof Error && (
            <div className="mt-4 border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] p-3 rounded-[2px] text-[12px] font-mono text-[var(--color-fg-2)]">
              {error.message}
            </div>
          )}
          <Button
            type="button"
            variant="primary"
            className="mt-5"
            onClick={() => refetch()}
          >
            REINTENTAR
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
        <h1 className="t-title">Tu plan y pagos</h1>
        <Pill state={data.state === "active" ? "running" : "idle"}>
          {data.plan.toUpperCase()} / {data.state.toUpperCase()}
        </Pill>
      </div>
      <p className="t-mono mb-6">
        Revisa tu plan, los límites de tu cuenta y tus pagos.
      </p>

      {data.isRestricted && (
        <Panel tone="danger" className="mb-6">
          <div className="t-label mb-2 text-[var(--color-danger)]">
            Pago rechazado
          </div>
          <p className="text-[13px] leading-[1.6] text-[var(--color-fg-2)] mb-4">
            El pago más reciente fue rechazado. Los proyectos existentes siguen operando con los datos ya recopilados, pero no podrás crear proyectos ni escalar hasta actualizar el medio de pago.
          </p>
          <Button
            type="button"
            variant="primary"
            onClick={openCustomerPortal}
            disabled={openingPortal || !data.stripeCustomerId}
          >
            {openingPortal ? "ABRIENDO..." : "ACTUALIZAR MEDIO DE PAGO →"}
          </Button>
        </Panel>
      )}

      {usageQuery.data && (
        <Panel
          tone={usageQuery.data.quotaState === "exhausted" ? "danger" : usageQuery.data.quotaState === "warning" ? "accent" : "default"}
          className="mb-5"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="t-label mb-1">Uso mensual de mensajes entregados</div>
              <div className="font-mono text-[20px] font-bold">
                {usageQuery.data.consumedMessages.toLocaleString("es-CO")} / {usageQuery.data.includedMessages.toLocaleString("es-CO")}
              </div>
            </div>
            <div className="font-mono text-[14px] text-[var(--color-fg-2)]">
              {usageQuery.data.percentage}% · ciclo hasta {fmtDate(usageQuery.data.cycleEnd)}
            </div>
          </div>
          <div className="mt-2 font-mono text-[12px] text-[var(--color-fg-3)]">
            Estado de cuota: {usageQuery.data.quotaState === "exhausted" ? "AGOTADA" : usageQuery.data.quotaState === "warning" ? "EN ALERTA" : "DISPONIBLE"}
          </div>
          <div className="mt-3 h-2 bg-[var(--color-bg-elev)] overflow-hidden rounded-[2px]">
            <div className="h-full bg-[var(--color-accent)]" style={{ width: `${Math.min(100, usageQuery.data.percentage)}%` }} />
          </div>
          <div className="mt-3 grid sm:grid-cols-3 gap-2 text-[12px] text-[var(--color-fg-3)]">
            <span>Recibidos: {usageQuery.data.messagesReceived.toLocaleString("es-CO")}</span>
            <span>Validados: {usageQuery.data.messagesValidated.toLocaleString("es-CO")}</span>
            <span>Fallidos: {usageQuery.data.messagesFailed.toLocaleString("es-CO")}</span>
          </div>
        </Panel>
      )}

      <div className="grid lg:grid-cols-[1fr_420px] gap-5">
        <section className="flex flex-col gap-5">
          <Panel tone={data.state === "active" ? "accent" : "default"}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="t-label mb-2">
                  Plan actual
                </div>
                <div className="text-[34px] font-mono font-bold text-[var(--color-fg-0)]">
                  {data.plan}
                </div>
              </div>
              <div className="text-right">
                <div className="t-label mb-2">Estado</div>
                <div className="font-mono text-[18px] font-bold text-[var(--color-fg-0)]">
                  {data.stripeSubscriptionStatus ?? data.state}
                </div>
                <div className="text-[12px] text-[var(--color-fg-3)] mt-1">
                  Pago: {data.stripePaymentStatus ?? "Sin información"}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-4 gap-3 mt-5">
              <div>
                <div className="t-label">Licencia</div>
                <div className="font-mono text-[14px] mt-1">
                  {data.licenseKeyLast4
                    ? `termina en ${data.licenseKeyLast4}`
                    : "Plan de prueba"}
                </div>
              </div>
              <div>
                <div className="t-label">Activación</div>
                <div className="font-mono text-[14px] mt-1">
                  {fmtDate(data.activatedAt)}
                </div>
              </div>
              <div>
                <div className="t-label">Vencimiento</div>
                <div className="font-mono text-[14px] mt-1">
                  {fmtDate(data.expiresAt)}
                </div>
              </div>
              <div>
                <div className="t-label">Renovación</div>
                <div className="font-mono text-[14px] mt-1">
                  {refreshingBilling
                    ? "Actualizando…"
                    : fmtDate(data.currentPeriodEnd)}
                </div>
              </div>
            </div>

            {(data.cancelAtPeriodEnd ||
              data.amountCents ||
              data.latestInvoiceId) && (
              <div className="mt-5 border-t border-[var(--color-border)] pt-4 text-[13px] leading-[1.7] text-[var(--color-fg-3)]">
                {data.amountCents && data.currency && (
                  <span>
                    Último cobro: {(data.amountCents / 100).toFixed(2)}{" "}
                    {data.currency.toUpperCase()}
                  </span>
                )}
                {data.cancelAtPeriodEnd && (
                  <span>
                    {data.amountCents && data.currency ? " · " : ""}
                    Se cancela al terminar el período
                  </span>
                )}
                {data.latestInvoiceId && (
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    <a
                      href="/api/stripe/invoice"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center font-mono rounded-[2px] transition-colors text-[12px] px-3 py-[6px] bg-transparent text-[var(--color-fg-1)] border border-[var(--color-border-strong)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    >
                      DESCARGAR FACTURA
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
                <div className="t-label">Uso de proyectos</div>
                <div className="font-mono text-[14px] mt-1">
                  {data.usage.pipelines} / {data.limits.maxPipelines} proyectos
                </div>
              </div>
              <div className="font-mono text-[22px] font-bold text-[var(--color-accent)]">
                {pipelinePct}%
              </div>
            </div>
            <div className="h-2 bg-[var(--color-bg-elev)] border border-[var(--color-border-subtle)]">
              <div
                className="h-full bg-[var(--color-accent)]"
                style={{ width: `${pipelinePct}%` }}
              />
            </div>
          </Panel>

          <Panel>
            <div className="t-label mb-3">Límites de despliegue</div>
            <div>
              <FeatureLine
                label="Réplicas por proyecto"
                value={`${data.limits.maxReplicasPerPipeline}`}
              />
              <FeatureLine
                label="Acceso para equipo"
                value={yesNo(data.limits.multiUser)}
              />
            </div>
          </Panel>

          <Panel tone="accent">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div>
                <div className="t-label mb-2">
                  {hasActivePaidPlan
                    ? "Más capacidad"
                    : "Elige un plan"}
                </div>
                <p className="text-[13px] leading-[1.6] text-[var(--color-fg-3)]">
                  {hasActivePaidPlan
                    ? `Ya tienes ${data.plan.toUpperCase()} activo. Los planes superiores permanecen ocultos hasta que quieras ampliar la capacidad.`
                    : "Usa Stripe para activar capacidad recurrente en los despliegues de tus clientes. Un pago exitoso genera y activa una licencia iot bees para el plan elegido."}
                </p>
              </div>
              {hasActivePaidPlan && availablePlans.length > 0 && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setShowUpgradePlans((value) => !value)}
                >
                  {showUpgradePlans ? "OCULTAR PLANES" : "VER PLANES"}
                </Button>
              )}
            </div>

            {hasActivePaidPlan && availablePlans.length === 0 && (
              <div className="border border-[var(--color-border)] bg-[var(--color-bg-elev)] rounded-[3px] p-4 text-[13px] leading-[1.6] text-[var(--color-fg-3)]">
                Ya tienes el plan disponible de mayor capacidad. Usa la gestión de facturación para actualizar tu medio de pago o la renovación.
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
                    className="border border-[var(--color-border)] bg-[var(--color-bg-elev)] rounded-[3px] p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="font-mono font-bold text-[18px] text-[var(--color-fg-0)]">
                          {plan.displayName}
                          {plan.organizationId != null && (
                            <span className="ml-2 text-[10px] uppercase text-[var(--color-accent)]">
                              personalizado
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] text-[var(--color-fg-3)]">
                          {plan.description ?? ""}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-[var(--color-accent)]">
                        {new Intl.NumberFormat("es-419", {
                          style: "currency",
                          currency: plan.currency,
                          maximumFractionDigits: 0,
                        }).format(plan.priceCents / 100)}
                        <span className="text-[11px] text-[var(--color-fg-4)] font-normal">
                          {" "}/ mes
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 mb-4">
                      <FeatureLine
                        label="Proyectos"
                        value={`${plan.maxPipelines}`}
                      />
                      <FeatureLine
                        label="Réplicas por proyecto"
                        value={`${plan.maxReplicasPerPipeline}`}
                      />
                      <FeatureLine
                        label="Acceso para equipo"
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
            <div className="t-label mb-2">Activación manual</div>
            <p className="text-[13px] leading-[1.6] text-[var(--color-fg-3)] mb-4">
              Úsala para pilotos, demostraciones o despliegues asistidos. Puedes usar claves como{" "}
              <span className="font-mono text-[var(--color-fg-1)]">
                IOTBEE-PRO-CLIENT01
              </span>
              . Para los planes recurrentes, usa Stripe arriba.
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
                ACTIVAR
              </Button>
            </form>
          </Panel>

          <Panel>
            <div className="t-label mb-2">Claves de licencia admitidas</div>
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
              onClick={() => setConfirmDeactivate(true)}
            >
              DESACTIVAR LICENCIA
            </Button>
          </Panel>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDeactivate}
        title="¿Desactivar la licencia?"
        danger
        confirmLabel="DESACTIVAR"
        busy={deactivate.isPending}
        message={
          <span>
            Los proyectos que superen los límites de prueba (
            <span className="font-mono">3 proyectos, 2 réplicas</span>) dejarán de aceptar nueva configuración. Reactivar un plan desde esta pantalla restaura la capacidad.
          </span>
        }
        onConfirm={() => {
          deactivate.mutate(undefined, {
            onSettled: () => setConfirmDeactivate(false),
          });
        }}
        onClose={() => setConfirmDeactivate(false)}
      />
    </div>
  );
}
