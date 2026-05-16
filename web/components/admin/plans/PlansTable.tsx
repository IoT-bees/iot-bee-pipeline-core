"use client";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { useDeletePlan } from "@/lib/hooks/usePlans";
import type { Plan } from "@/lib/api/types";

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function Features({ plan }: { plan: Plan }) {
  const f: string[] = [];
  if (plan.alertsEnabled) f.push("alerts");
  if (plan.premiumConnectors) f.push("premium");
  if (plan.multiUser) f.push("multi-user");
  if (f.length === 0) return <span className="text-[var(--color-fg-4)]">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {f.map((x) => (
        <span
          key={x}
          className="text-[10px] tracking-[1.5px] uppercase border border-[#333] text-[var(--color-fg-3)] px-1.5 py-[1px] rounded-[2px]"
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
  return (
    <Table>
      <THead>
        <TH>slug</TH>
        <TH>name</TH>
        <TH>price</TH>
        <TH>limits</TH>
        <TH>features</TH>
        <TH>scope</TH>
        <TH className="text-right">actions</TH>
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
              <div>{p.maxPipelines} pipelines</div>
              <div className="text-[var(--color-fg-3)]">
                {p.maxReplicasPerPipeline} replicas
              </div>
            </TD>
            <TD>
              <Features plan={p} />
            </TD>
            <TD className="text-[12px]">
              {p.organizationId != null ? (
                <span className="text-[var(--color-accent)] font-mono">
                  custom · org #{p.organizationId}
                </span>
              ) : (
                <span className="text-[var(--color-fg-3)]">global</span>
              )}
            </TD>
            <TD className="text-right">
              <Button variant="ghost" size="sm" onClick={() => onEdit(p)}>
                edit
              </Button>
              {(p.organizationId != null || p.slug !== "free") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (
                      confirm(
                        `Delete plan "${p.displayName}" (${p.slug})? This cannot be undone.`,
                      )
                    ) {
                      del.mutate(p.id);
                    }
                  }}
                >
                  delete
                </Button>
              )}
            </TD>
          </TR>
        ))}
      </tbody>
    </Table>
  );
}
