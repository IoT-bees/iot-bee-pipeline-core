"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/ui/Panel";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStateMessage } from "@/components/admin/AdminStateMessage";
import { adminApi } from "@/lib/api/endpoints/admin";

export default function AdminOrgStatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const orgId = Number(id);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "orgs", orgId, "state"],
    queryFn: () => adminApi.orgState(orgId),
    enabled: Number.isFinite(orgId),
  });

  if (isLoading) {
    return <HoneycombLoader />;
  }
  if (error) {
    return (
      <AdminStateMessage kind="error" title="No pudimos cargar el estado de la organización" description={(error as Error).message} />
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-4 font-mono">
      <AdminPageHeader title={data.org.name} description="Resumen administrativo del plan, los proyectos y la actividad reciente de esta organización." meta={`Slug: ${data.org.slug} · ID ${data.org.id}`} />

      <Panel>
        <div className="text-[12px] font-semibold uppercase text-[var(--color-accent-strong)] mb-3">
          Plan de la organización
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-[14px] sm:grid-cols-2">
          <div>
            Plan ·{" "}
            <span className="text-[var(--color-fg-0)]">
              {data.license.plan}
            </span>
          </div>
          <div>
            Estado ·{" "}
            <span className="text-[var(--color-fg-0)]">
              {data.license.state}
            </span>
          </div>
          <div>
            Origen ·{" "}
            <span className="text-[var(--color-fg-3)]">
              {data.license.planSource}
            </span>
          </div>
          <div>
            Uso de proyectos ·{" "}
            <span className="text-[var(--color-fg-0)]">
              {data.license.usage.pipelines}
            </span>{" "}
            / {data.license.limits.maxPipelines} proyectos
          </div>
          {data.license.expiresAt && (
            <div>
              Vence ·{" "}
              <span className="text-[var(--color-fg-3)]">
                {new Date(data.license.expiresAt).toLocaleString()}
              </span>
            </div>
          )}
          {data.license.stripeSubscriptionStatus && (
            <div>
              stripe ·{" "}
              <span className="text-[var(--color-fg-3)]">
                {data.license.stripeSubscriptionStatus}
              </span>
            </div>
          )}
          {data.license.isRestricted && (
            <div className="col-span-2 text-[var(--color-danger)]">
              Acceso restringido (pago pendiente o vencido)
            </div>
          )}
        </div>
      </Panel>

      <Panel>
        <div className="text-[12px] font-semibold uppercase text-[var(--color-accent-strong)] mb-3">
          Proyectos ({data.pipelines.length})
        </div>
        {data.pipelines.length === 0 ? (
          <AdminStateMessage kind="empty" title="No hay proyectos registrados" description="Los proyectos de esta organización aparecerán aquí cuando se creen." />
        ) : (
          <Table>
            <THead>
              <TH>ID</TH>
              <TH>NOMBRE</TH>
              <TH>ESTADO</TH>
            </THead>
            <tbody>
              {data.pipelines.map((p) => (
                <TR key={p.id}>
                  <TD className="font-mono text-[11px] text-[var(--color-fg-3)]">
                    {p.id}
                  </TD>
                  <TD>{p.name}</TD>
                  <TD>
                    <span
                      className={`text-[10px] uppercase border px-2 py-[2px] rounded-[2px] ${
                        p.status === "active"
                          ? "border-[var(--color-online)] text-[var(--color-online)]"
                          : "border-[var(--color-border-strong)] text-[var(--color-fg-3)]"
                      }`}
                    >
                      {p.status}
                    </span>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <Panel>
        <div className="text-[12px] font-semibold uppercase text-[var(--color-accent-strong)] mb-3">
          Actividad reciente (últimas 20)
        </div>
        {data.recentAudit.length === 0 ? (
          <AdminStateMessage kind="empty" title="No hay actividad reciente" description="Las próximas acciones registradas para esta organización aparecerán aquí." />
        ) : (
          <Table>
            <THead>
              <TH>FECHA</TH>
              <TH>ACCIÓN</TH>
              <TH>MÉTODO</TH>
              <TH>RUTA</TH>
              <TH>USUARIO</TH>
              <TH>ESTADO</TH>
            </THead>
            <tbody>
              {data.recentAudit.map((e) => (
                <TR key={e.id}>
                  <TD className="font-mono text-[11px] text-[var(--color-fg-3)]">
                    {new Date(e.createdAt).toLocaleString()}
                  </TD>
                  <TD className="font-mono text-[12px]">{e.action}</TD>
                  <TD className="font-mono text-[11px]">{e.method}</TD>
                  <TD className="font-mono text-[11px] text-[var(--color-fg-3)]">
                    {e.path}
                  </TD>
                  <TD className="font-mono text-[11px]">{e.userEmail ?? "—"}</TD>
                  <TD className="font-mono text-[11px]">
                    {e.statusCode ?? "—"}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
