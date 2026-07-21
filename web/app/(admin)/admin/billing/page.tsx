"use client";
import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { PlansTable } from "@/components/admin/plans/PlansTable";
import { PlanDialog } from "@/components/admin/plans/PlanDialog";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStateMessage } from "@/components/admin/AdminStateMessage";
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
      <AdminPageHeader title="Planes" description="Configura el catálogo comercial y los límites que verá cada organización. Revisa el alcance antes de publicar un plan personalizado." meta={data ? `${globalPlans.length} planes generales · ${customPlans.length} planes personalizados` : undefined} />

      <Panel tone="accent">
        <div className="text-[12px] text-[var(--color-fg-3)] leading-relaxed">
          <span className="text-[var(--color-accent)] uppercase text-[10px]">
            Importante
          </span>{" "}
          Al editar estos límites actualizas el catálogo de planes y los valores que verá cada organización. La aplicación del límite en tiempo de ejecución aún usa la configuración existente; este catálogo debe revisarse antes de ofrecer un nuevo plan.
        </div>
      </Panel>

      {isLoading && (
        <HoneycombLoader />
      )}
      {error && <AdminStateMessage kind="error" title="No pudimos cargar los planes" description={(error as Error).message} />}

      {data && (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] text-[var(--color-fg-1)] uppercase">
                Planes generales
              </h3>
              <Button
                size="sm"
                variant="primary"
                onClick={() => openCreate(false)}
              >
                + Crear plan general
              </Button>
            </div>
            <Panel>
              {globalPlans.length === 0 ? (
                <AdminStateMessage kind="empty" title="Aún no hay planes generales" description="Crea un plan para definir los límites y capacidades disponibles para las organizaciones." />
              ) : <PlansTable plans={globalPlans} onEdit={openEdit} />}
            </Panel>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] text-[var(--color-fg-1)] uppercase">
                Planes por organización
              </h3>
              <Button
                size="sm"
                variant="primary"
                onClick={() => openCreate(true)}
              >
                + Crear plan por organización
              </Button>
            </div>
            <Panel>
              {customPlans.length === 0 ? (
                <AdminStateMessage kind="empty" title="No hay planes personalizados" description="Crea uno sólo cuando una organización necesite reemplazar un plan general equivalente." />
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
