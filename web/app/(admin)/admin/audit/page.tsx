"use client";
import { useDeferredValue, useMemo, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { AuditFilters } from "@/components/admin/audit/AuditFilters";
import { AuditTable } from "@/components/admin/audit/AuditTable";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStateMessage } from "@/components/admin/AdminStateMessage";
import { useAuditEvents } from "@/lib/hooks/useAudit";
import type { AuditFilters as Filters } from "@/lib/api/types";

export default function AdminAuditPage() {
  const [filters, setFilters] = useState<Filters>({});
  // Evita una solicitud por cada pulsación al buscar en una auditoría grande.
  const deferredFilters = useDeferredValue(filters);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error, refetch } =
    useAuditEvents(deferredFilters);

  const events = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Auditoría"
        description="Consulta las acciones administrativas y operativas registradas. Filtra los eventos para investigar cambios, errores o actividad inusual."
        meta={events.length > 0 ? `${events.length} evento${events.length === 1 ? "" : "s"} cargado${events.length === 1 ? "" : "s"}` : undefined}
      />
      <Panel>
        <AuditFilters value={filters} onChange={setFilters} />
      </Panel>
      <Panel>
        {isLoading && (
          <HoneycombLoader />
        )}
        {error && <AdminStateMessage kind="error" title="No pudimos cargar la auditoría" description={(error as Error).message} onRetry={() => void refetch()} />}
        {!isLoading && events.length === 0 && !error && (
          <AdminStateMessage kind="empty" title="No hay eventos para estos filtros" description="Las acciones realizadas por administradores u operadores aparecerán aquí cuando se registren." />
        )}
        {events.length > 0 && (
          <AuditTable
            events={events}
            hasNext={!!hasNextPage}
            onLoadMore={() => fetchNextPage()}
            isFetchingNext={isFetchingNextPage}
          />
        )}
      </Panel>
    </div>
  );
}
