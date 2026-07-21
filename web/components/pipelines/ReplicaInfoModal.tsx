"use client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { toPillState } from "@/lib/status";
import { timeAgo } from "@/lib/fmt";
import type { Pipeline } from "@/lib/api/types";

interface Props {
  open: boolean;
  onClose: () => void;
  pipeline: Pipeline;
  pipelineGeneralStatus: string | undefined;
  replicaId: string;
  replicaStatus: string;
  lastError?: string | null;
  lastProcessedAt?: string | null;
}

function formatTimestamp(iso: string): { absolute: string; relative: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { absolute: iso, relative: "" };
  const absolute = d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  let relative: string;
  if (Math.abs(sec) < 60) relative = `Hace ${sec} s`;
  else if (Math.abs(min) < 60) relative = `Hace ${min} min`;
  else if (Math.abs(hr) < 24) relative = `Hace ${hr} h`;
  else relative = `Hace ${day} d`;
  return { absolute, relative };
}

export function ReplicaInfoModal({
  open,
  onClose,
  pipeline,
  pipelineGeneralStatus,
  replicaId,
  replicaStatus,
  lastError,
  lastProcessedAt,
}: Props) {
  const pid = pipeline.id;
  const rid = replicaId;
  const searchKey = `pipeline=${pid}::replica=${rid}`;

  return (
    <Modal open={open} onClose={onClose} className="max-w-[640px]">
      <div className="border-b border-[var(--color-accent)] p-4 flex items-center justify-between">
        <div>
          <div className="t-label">DETALLE DE RÉPLICA</div>
          <div className="font-bold mt-1">
            {pipeline.name} <span className="text-[var(--color-fg-3)]">·</span>{" "}
            réplica #{rid}
          </div>
        </div>
        <Pill state={toPillState(replicaStatus)}>
          {replicaStatus.toUpperCase()}
        </Pill>
      </div>

      <div className="p-4 flex flex-col gap-5 text-[12px] font-mono select-text max-h-[70vh] overflow-y-auto">
        <Section title="RÉPLICA">
          <Row label="Identificador" value={rid} />
          <Row label="Estado" value={replicaStatus} />
          <Row label="Clave de búsqueda" value={searchKey} />
          <Row label="Último procesamiento" value={timeAgo(lastProcessedAt)} />
          <Row label="Último error" value={lastError ?? "—"} />
        </Section>

        <Section title="PROYECTO">
          <Row label="Identificador" value={String(pid)} />
          <Row
            label="Estado del proyecto"
            value={pipelineGeneralStatus ?? "detenido"}
          />
          <Row
            label="Réplicas"
            value={String(pipeline.replicationFactor)}
          />
        </Section>

        <Section title="REFERENCIAS">
          <Row
            label="Conexión"
            value={`#${pipeline.dataSource.id} · ${pipeline.dataSource.name}${
              pipeline.dataSource.sourceType
                ? ` (${pipeline.dataSource.sourceType})`
                : ""
            }`}
          />
          <Row
            label="Destino"
            value={`#${pipeline.dataStore.id} · ${pipeline.dataStore.name}${
              pipeline.dataStore.storeType
                ? ` (${pipeline.dataStore.storeType})`
                : ""
            }`}
          />
          <Row
            label="Esquema"
            value={`#${pipeline.dataValidationSchema.id} · ${pipeline.dataValidationSchema.name}`}
          />
          <Row
            label="Grupo de cliente"
            value={`#${pipeline.pipelineGroup.id} · ${pipeline.pipelineGroup.name}`}
          />
        </Section>

        {(pipeline.createdAt || pipeline.updatedAt) && (
          <Section title="FECHAS">
            {pipeline.createdAt && (
              <TimeRow label="Creación" iso={pipeline.createdAt} />
            )}
            {pipeline.updatedAt && (
              <TimeRow label="Última actualización" iso={pipeline.updatedAt} />
            )}
          </Section>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] p-3 flex justify-end">
        <Button autoFocus variant="ghost" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="t-label mb-2">{"// "}{title}</div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 items-baseline">
      <div className="text-[var(--color-fg-3)] uppercase">
        {label}
      </div>
      <div className="text-[var(--color-fg-1)] break-all">{value}</div>
    </div>
  );
}

function TimeRow({ label, iso }: { label: string; iso: string }) {
  const { absolute, relative } = formatTimestamp(iso);
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 items-baseline">
      <div className="text-[var(--color-fg-3)] uppercase">
        {label}
      </div>
      <div className="text-[var(--color-fg-1)]">
        {absolute}
        {relative && (
          <span className="text-[var(--color-fg-3)] ml-2">({relative})</span>
        )}
      </div>
    </div>
  );
}
