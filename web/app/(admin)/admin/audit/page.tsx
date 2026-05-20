"use client";
import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { AuditFilters } from "@/components/admin/audit/AuditFilters";
import { AuditTable } from "@/components/admin/audit/AuditTable";
import { useAuditEvents } from "@/lib/hooks/useAudit";
import type { AuditFilters as Filters } from "@/lib/api/types";

export default function AdminAuditPage() {
  const [filters, setFilters] = useState<Filters>({});
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useAuditEvents(filters);

  const events = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  return (
    <div className="space-y-4">
      <h2 className="text-[18px] font-bold text-[var(--color-fg-0)] font-mono">
        audit
      </h2>
      <Panel>
        <AuditFilters value={filters} onChange={setFilters} />
      </Panel>
      <Panel>
        {isLoading && (
          <div className="text-[13px] text-[var(--color-fg-3)] font-mono">
            Loading…
          </div>
        )}
        {error && (
          <div className="text-[13px] text-[var(--color-danger)] font-mono">
            {(error as Error).message}
          </div>
        )}
        {!isLoading && events.length === 0 && !error && (
          <div className="text-[13px] text-[var(--color-fg-3)] font-mono">
            No audit events yet. Mutable actions appear here once admins or
            operators make changes.
          </div>
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
