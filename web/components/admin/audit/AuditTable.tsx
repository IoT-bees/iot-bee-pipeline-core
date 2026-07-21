"use client";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import type { AuditEvent } from "@/lib/api/types";

function StatusCell({ s }: { s: number | null }) {
  if (s == null) return <span className="text-[var(--color-fg-4)]">—</span>;
  const color =
    s < 300
      ? "var(--color-online)"
      : s < 500
        ? "var(--color-fg-3)"
        : "var(--color-danger)";
  return (
    <span style={{ color }} className="font-mono">
      {s}
    </span>
  );
}

export function AuditTable({
  events,
  hasNext,
  onLoadMore,
  isFetchingNext,
}: {
  events: AuditEvent[];
  hasNext: boolean;
  onLoadMore: () => void;
  isFetchingNext: boolean;
}) {
  return (
    <div className="font-mono">
      <Table>
        <THead>
          <TH>fecha</TH>
          <TH>usuario</TH>
          <TH>método</TH>
          <TH>ruta</TH>
          <TH>estado</TH>
          <TH>ip</TH>
        </THead>
        <tbody>
          {events.map((e) => (
            <TR key={e.id}>
              <TD className="text-[11px] text-[var(--color-fg-3)] whitespace-nowrap">
                {new Date(e.createdAt).toLocaleString()}
              </TD>
              <TD className="text-[13px]">
                {e.userEmail ?? "—"}
                {e.userRole && (
                  <span className="ml-2 text-[10px] uppercase text-[var(--color-fg-4)]">
                    {e.userRole}
                  </span>
                )}
              </TD>
              <TD className="text-[12px]">{e.method}</TD>
              <TD className="font-mono text-[12px] break-all">{e.path}</TD>
              <TD>
                <StatusCell s={e.statusCode} />
              </TD>
              <TD className="text-[11px] text-[var(--color-fg-3)]">
                {e.ipAddress ?? "—"}
              </TD>
            </TR>
          ))}
        </tbody>
      </Table>
      <div className="mt-3 flex justify-center">
        {hasNext ? (
          <Button
            variant="ghost"
            onClick={onLoadMore}
            disabled={isFetchingNext}
          >
            {isFetchingNext ? "Cargando…" : "Cargar más"}
          </Button>
        ) : (
          events.length > 0 && (
            <span className="text-[11px] text-[var(--color-fg-4)] uppercase">
              Fin de los registros
            </span>
          )
        )}
      </div>
    </div>
  );
}
