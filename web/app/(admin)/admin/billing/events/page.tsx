"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStateMessage } from "@/components/admin/AdminStateMessage";
import { adminApi } from "@/lib/api/endpoints/admin";
import type { BillingEvent } from "@/lib/api/types";

function StatusPill({ event }: { event: BillingEvent }) {
  const label = event.processedOk ? "Procesado" : event.lastError ? "Falló" : "Pendiente";
  const tone = event.processedOk ? "online" : event.lastError ? "danger" : "accent";
  return (
    <span
      className={`inline-block text-[11px] uppercase border px-2 py-[2px] rounded-[2px] ${
        tone === "online"
          ? "border-[var(--color-online)] text-[var(--color-online)]"
          : tone === "danger"
            ? "border-[var(--color-danger)] text-[var(--color-danger)]"
            : "border-[var(--color-accent)] text-[var(--color-accent-strong)]"
      }`}
    >
      {label}
    </span>
  );
}

function EventRow({
  event,
  onAskRetry,
}: {
  event: BillingEvent;
  onAskRetry: (event: BillingEvent) => void;
}) {
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
        <StatusPill event={event} />
      </TD>
      <TD className="font-mono text-[11px] text-[var(--color-fg-3)]">
        {new Date(event.createdAt).toLocaleString()}
      </TD>
      <TD className="font-mono text-[11px] text-[var(--color-danger)]">
        {event.lastError ?? ""}
      </TD>
      <TD className="text-right">
        {!event.processedOk && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAskRetry(event)}
          >
            Reintentar
          </Button>
        )}
      </TD>
    </TR>
  );
}

export default function AdminBillingEventsPage() {
  const [cursors, setCursors] = useState<(number | undefined)[]>([undefined]);
  const [pendingRetry, setPendingRetry] = useState<BillingEvent | null>(null);
  const cursor = cursors.at(-1);
  const queryClient = useQueryClient();
  const retry = useMutation({
    mutationFn: (eventId: number) => adminApi.retryBillingEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "billing", "events"] });
      setPendingRetry(null);
    },
  });
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "billing", "events", cursor],
    queryFn: () => adminApi.listBillingEvents({ limit: 50, cursor }),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-4 font-mono">
      <AdminPageHeader title="Eventos de facturación" description="Revisa los webhooks recibidos de Stripe. Reintenta sólo eventos fallidos después de haber corregido la causa." meta={data ? `${data.items.length} evento${data.items.length === 1 ? "" : "s"} en esta página` : undefined} />
      <Panel>
        {isLoading && (
          <HoneycombLoader />
        )}
        {error && <AdminStateMessage kind="error" title="No pudimos cargar los eventos" description={(error as Error).message} />}
        {!isLoading && data && data.items.length === 0 && (
          <AdminStateMessage kind="empty" title="Aún no hay eventos de facturación" description="Cuando Stripe envíe un webhook, su estado aparecerá aquí para poder verificarlo o reintentarlo." />
        )}
        {data && data.items.length > 0 && (
          <>
          <Table>
            <THead>
              <TH>id</TH>
              <TH>tipo</TH>
              <TH>ID de Stripe</TH>
              <TH>estado</TH>
              <TH>recibido</TH>
              <TH>último error</TH>
              <TH className="text-right">acciones</TH>
            </THead>
            <tbody>
              {data.items.map((e) => (
                <EventRow key={e.id} event={e} onAskRetry={setPendingRetry} />
              ))}
            </tbody>
          </Table>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={cursors.length === 1}
              onClick={() => setCursors((pages) => pages.slice(0, -1))}
            >
              Anterior
            </Button>
            <span className="text-[11px] text-[var(--color-fg-3)]">Página {cursors.length}</span>
            <Button
              variant="ghost"
              size="sm"
              disabled={!data.nextCursor}
              onClick={() => {
                const nextCursor = data.nextCursor;
                if (nextCursor != null) setCursors((pages) => [...pages, nextCursor]);
              }}
            >
              Siguiente
            </Button>
          </div>
          </>
        )}
      </Panel>
      <ConfirmDialog
        open={pendingRetry !== null}
        title={`¿Reintentar el evento ${pendingRetry?.id ?? ""}?`}
        message="Se volverá a procesar el payload almacenado de Stripe para esta organización. No se muestra ni se modifica información de pago en esta pantalla."
        confirmLabel="Reintentar evento"
        busy={retry.isPending}
        error={retry.error?.message}
        onConfirm={() => pendingRetry && retry.mutate(pendingRetry.id)}
        onClose={() => !retry.isPending && setPendingRetry(null)}
      />
    </div>
  );
}
