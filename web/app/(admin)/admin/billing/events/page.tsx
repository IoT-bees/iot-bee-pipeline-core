"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { adminApi } from "@/lib/api/endpoints/admin";
import { useToasts } from "@/lib/store/useToasts";
import type { BillingEvent } from "@/lib/api/types";

function StatusPill({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block text-[10px] tracking-[1.5px] uppercase border px-2 py-[2px] rounded-[2px] ${
        ok
          ? "border-[var(--color-online)] text-[var(--color-online)]"
          : "border-[var(--color-danger)] text-[var(--color-danger)]"
      }`}
    >
      {ok ? "ok" : "pending"}
    </span>
  );
}

function EventRow({ event }: { event: BillingEvent }) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  const retry = useMutation({
    mutationFn: () => adminApi.retryBillingEvent(event.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "billing", "events"] });
      push({ kind: "success", message: `event ${event.id} retried` });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
  return (
    <TR>
      <TD className="font-mono text-[11px] text-[var(--color-fg-3)]">
        {event.id}
      </TD>
      <TD className="font-mono text-[12px]">{event.eventType}</TD>
      <TD className="font-mono text-[11px] text-[var(--color-fg-3)]">
        {event.stripeEventId}
      </TD>
      <TD>
        <StatusPill ok={event.processedOk} />
      </TD>
      <TD className="font-mono text-[11px] text-[var(--color-fg-3)]">
        {new Date(event.createdAt).toLocaleString()}
      </TD>
      <TD className="font-mono text-[11px] text-[var(--color-danger)]">
        {event.lastError ?? ""}
      </TD>
      <TD className="text-right">
        <Button
          variant="ghost"
          size="sm"
          disabled={retry.isPending}
          onClick={() => retry.mutate()}
        >
          {retry.isPending ? "retrying…" : "retry"}
        </Button>
      </TD>
    </TR>
  );
}

export default function AdminBillingEventsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "billing", "events"],
    queryFn: () => adminApi.listBillingEvents(50),
  });

  return (
    <div className="space-y-4 font-mono">
      <h2 className="text-[18px] font-bold text-[var(--color-fg-0)]">
        billing · events
      </h2>
      <Panel>
        {isLoading && (
          <div className="text-[13px] text-[var(--color-fg-3)]">Loading…</div>
        )}
        {error && (
          <div className="text-[13px] text-[var(--color-danger)]">
            {(error as Error).message}
          </div>
        )}
        {!isLoading && data && data.items.length === 0 && (
          <div className="text-[13px] text-[var(--color-fg-3)]">
            No billing events yet. Stripe webhooks land here once sync-stripe
            secret is wired and Stripe starts firing webhooks.
          </div>
        )}
        {data && data.items.length > 0 && (
          <Table>
            <THead>
              <TH>id</TH>
              <TH>type</TH>
              <TH>stripe id</TH>
              <TH>status</TH>
              <TH>received</TH>
              <TH>last error</TH>
              <TH className="text-right">actions</TH>
            </THead>
            <tbody>
              {data.items.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
