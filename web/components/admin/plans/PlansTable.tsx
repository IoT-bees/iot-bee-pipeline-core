"use client";
import { useState } from "react";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { DeleteResourceDialog } from "@/components/ui/DeleteResourceDialog";
import { useDeletePlan } from "@/lib/hooks/usePlans";
import type { Plan } from "@/lib/api/types";

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("es-419", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function Features({ plan }: { plan: Plan }) {
  const f: string[] = [];
  if (plan.alertsEnabled) f.push("alertas");
  if (plan.premiumConnectors) f.push("conectores premium");
  if (plan.multiUser) f.push("equipo");
  if (f.length === 0) return <span className="text-[var(--color-fg-4)]">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {f.map((x) => (
        <span
          key={x}
          className="text-[10px] uppercase border border-[var(--color-border-strong)] text-[var(--color-fg-3)] px-1.5 py-[1px] rounded-[2px]"
        >
          {x}
        </span>
      ))}
    </div>
  );
}

export function PlansTable({
  plans,
  onEdit,
}: {
  plans: Plan[];
  onEdit: (plan: Plan) => void;
}) {
  const del = useDeletePlan();
  const [pending, setPending] = useState<Plan | null>(null);

  function confirmDelete() {
    if (!pending) return;
    del.mutate(pending.id, { onSuccess: () => setPending(null) });
  }

  return (
    <>
      <Table>
        <THead>
          <TH>slug</TH>
          <TH>nombre</TH>
          <TH>precio</TH>
          <TH>límites</TH>
          <TH>incluye</TH>
          <TH>alcance</TH>
          <TH className="text-right">acciones</TH>
        </THead>
        <tbody>
          {plans.map((p) => (
            <TR key={p.id}>
              <TD className="font-mono text-[13px]">{p.slug}</TD>
              <TD>{p.displayName}</TD>
              <TD className="font-mono text-[13px]">
                {formatPrice(p.priceCents, p.currency)}
              </TD>
              <TD className="text-[12px]">
                <div>{p.maxPipelines} proyectos</div>
                <div className="text-[var(--color-fg-3)]">
                  {p.maxReplicasPerPipeline} réplicas por proyecto
                </div>
                <div className="text-[var(--color-fg-3)]">
                  {new Intl.NumberFormat("es-419").format(p.includedMessagesMonthly)} mensajes/mes
                </div>
              </TD>
              <TD>
                <Features plan={p} />
              </TD>
              <TD className="text-[12px]">
                {p.organizationId != null ? (
                  <span className="text-[var(--color-accent)] font-mono">
                    personalizado · organización #{p.organizationId}
                  </span>
                ) : (
                  <span className="text-[var(--color-fg-3)]">general</span>
                )}
              </TD>
              <TD className="text-right">
                <div className="inline-flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(p)}>
                    Editar
                  </Button>
                  {(p.organizationId != null || p.slug !== "free") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPending(p)}
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              </TD>
            </TR>
          ))}
        </tbody>
      </Table>
      <DeleteResourceDialog
        pending={pending ? { name: `${pending.displayName} (${pending.slug})` } : null}
        resourceLabel="plan"
        impact={
          pending?.organizationId != null
            ? "La organización volverá a usar el plan general equivalente."
            : "Las organizaciones que usen este plan deberán migrar a otro."
        }
        busy={del.isPending}
        error={del.error?.message}
        onConfirm={confirmDelete}
        onClose={() => !del.isPending && setPending(null)}
      />
    </>
  );
}
