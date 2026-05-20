"use client";
import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { PlansTable } from "@/components/admin/plans/PlansTable";
import { PlanDialog } from "@/components/admin/plans/PlanDialog";
import { usePlans } from "@/lib/hooks/usePlans";
import type { Plan } from "@/lib/api/types";

export default function AdminBillingPage() {
  const { data, isLoading, error } = usePlans();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | undefined>(undefined);
  const [defaultIsCustom, setDefaultIsCustom] = useState(false);

  const globalPlans = data?.items.filter((p) => p.organizationId == null) ?? [];
  const customPlans = data?.items.filter((p) => p.organizationId != null) ?? [];

  function openCreate(custom: boolean) {
    setEditing(undefined);
    setDefaultIsCustom(custom);
    setDialogOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditing(plan);
    setDefaultIsCustom(plan.organizationId != null);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6 font-mono">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-[var(--color-fg-0)]">
          billing · plans
        </h2>
      </div>

      <Panel tone="accent">
        <div className="text-[12px] text-[var(--color-fg-3)] leading-relaxed">
          <span className="text-[var(--color-accent)] tracking-[1.5px] uppercase text-[10px]">
            heads up
          </span>{" "}
          Editing limits here updates the plan catalog and the values customers
          will see. Runtime enforcement still reads the legacy hardcoded limits
          for now — a follow-up plumbs <code>organization_id</code> through the
          pipeline cases so these values take effect at gate-check time.
        </div>
      </Panel>

      {isLoading && (
        <div className="text-[13px] text-[var(--color-fg-3)]">Loading…</div>
      )}
      {error && (
        <div className="text-[13px] text-[var(--color-danger)]">
          {(error as Error).message}
        </div>
      )}

      {data && (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] text-[var(--color-fg-1)] tracking-[1.5px] uppercase">
                global plans
              </h3>
              <Button
                size="sm"
                variant="primary"
                onClick={() => openCreate(false)}
              >
                + New global plan
              </Button>
            </div>
            <Panel>
              <PlansTable plans={globalPlans} onEdit={openEdit} />
            </Panel>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] text-[var(--color-fg-1)] tracking-[1.5px] uppercase">
                custom plans (per organization)
              </h3>
              <Button
                size="sm"
                variant="primary"
                onClick={() => openCreate(true)}
              >
                + New custom plan
              </Button>
            </div>
            <Panel>
              {customPlans.length === 0 ? (
                <div className="text-[12px] text-[var(--color-fg-3)] py-4 text-center">
                  No custom plans yet. Custom plans override the global one for
                  a specific organization id.
                </div>
              ) : (
                <PlansTable plans={customPlans} onEdit={openEdit} />
              )}
            </Panel>
          </section>
        </>
      )}

      <PlanDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        defaultIsCustom={defaultIsCustom}
      />
    </div>
  );
}
