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
          <TR>
            <TH>when</TH>
            <TH>user</TH>
            <TH>method</TH>
            <TH>path</TH>
            <TH>status</TH>
            <TH>ip</TH>
          </TR>
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
                  <span className="ml-2 text-[10px] tracking-[1.5px] uppercase text-[var(--color-fg-4)]">
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
            {isFetchingNext ? "Loading…" : "Load more"}
          </Button>
        ) : (
          events.length > 0 && (
            <span className="text-[11px] text-[var(--color-fg-4)] tracking-[1.5px] uppercase">
              {"// "}end
            </span>
          )
        )}
      </div>
    </div>
  );
}
