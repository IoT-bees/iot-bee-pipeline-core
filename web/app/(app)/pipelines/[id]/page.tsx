"use client";
import { use, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, LayoutGrid } from "lucide-react";

import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { Modal } from "@/components/ui/Modal";
import { BeeIcon } from "@/components/ui/icons/BeeIcon";
import { HexIcon } from "@/components/ui/icons/HexIcon";
import { PipelineActions } from "@/components/pipelines/PipelineActions";
import { EditFieldButton } from "@/components/pipelines/EditFieldButton";
import { PipelineFlowEditor } from "@/components/pipelines/PipelineFlowEditor";
import { RescaleControl } from "@/components/pipelines/RescaleControl";
import {
  usePipeline,
  useUpdatePipelineGroup,
  useUpdatePipelineReplicas,
} from "@/lib/hooks/usePipelines";
import { usePipelineStatusAll } from "@/lib/hooks/usePipelineStatusAll";
import { useLicenseStatus } from "@/lib/hooks/useLicense";
import { fmtId, formatDateTime } from "@/lib/fmt";
import { summarizeFlowTelemetry } from "@/lib/flowTelemetry";
import { isActiveReplica, pipelineStatusLabel, toPillState } from "@/lib/status";
import styles from "./page.module.css";

function ReplicaCard({
  id,
  status,
  lastProcessedAt,
  delivered,
  onViewDetail,
}: {
  id: number;
  status: string;
  lastProcessedAt: string | null;
  delivered: number;
  onViewDetail: () => void;
}) {
  const previousActivity = useRef(lastProcessedAt);
  const [pulseVersion, setPulseVersion] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const operational = isActiveReplica(status);

  useEffect(() => {
    if (lastProcessedAt && lastProcessedAt !== previousActivity.current) {
      setPulseVersion((version) => version + 1);
    }
    previousActivity.current = lastProcessedAt;
  }, [lastProcessedAt]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Panel className="min-h-44 p-3">
      <div className="flex items-start gap-3">
        <span key={pulseVersion} className={`flex h-14 w-14 shrink-0 items-center justify-center bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-[var(--color-accent)] [clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0_50%)] ${pulseVersion > 0 ? styles.activityPulse : ""}`}>
          <BeeIcon size={27} />
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <p className="font-mono text-[14px] text-[var(--color-fg-0)]">Réplica #{id}</p>
          <p className={`mt-1 inline-flex items-center gap-1.5 text-[15px] font-bold ${operational ? "text-[var(--color-online)]" : "text-[var(--color-fg-3)]"}`}>
            <span className="h-2 w-2 rounded-full bg-current" />
            {pipelineStatusLabel(status)}
          </p>
        </div>
        <button
          type="button"
          onClick={onViewDetail}
          title="Ver detalle de la réplica"
          aria-label={`Ver detalle de la réplica #${id}`}
          className="rounded-[2px] border border-[var(--color-border-strong)] p-1.5 text-[var(--color-fg-3)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          <Eye size={14} />
        </button>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--color-border-subtle)] pt-3">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-[var(--color-fg-3)]">Actividad</dt>
          <dd className="mt-1 text-[14px] font-semibold text-[var(--color-fg-0)]">Hace {formatRelativeTime(lastProcessedAt, now)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-[var(--color-fg-3)]">Entregados</dt>
          <dd className="mt-1 text-[14px] font-semibold text-[var(--color-online)]">{formatNumber(delivered)}</dd>
        </div>
      </dl>
    </Panel>
  );
}

type StatusReplica = {
  replica_id: number;
  status: string;
  last_processed_at: string | null;
  last_error: string | null;
};

function ReplicaHiveCell({
  id,
  status,
  lastProcessedAt,
  delivered,
  onViewDetail,
  style,
}: {
  id: number;
  status: string;
  lastProcessedAt: string | null;
  delivered: number;
  onViewDetail: () => void;
  style: CSSProperties;
}) {
  const previousActivity = useRef(lastProcessedAt);
  const [pulseVersion, setPulseVersion] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const operational = isActiveReplica(status);
  const activity = lastProcessedAt ? `Hace ${formatRelativeTime(lastProcessedAt, now)}` : "Sin actividad";

  useEffect(() => {
    if (lastProcessedAt && lastProcessedAt !== previousActivity.current) {
      setPulseVersion((version) => version + 1);
    }
    previousActivity.current = lastProcessedAt;
  }, [lastProcessedAt]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <button
      type="button"
      onClick={onViewDetail}
      title="Ver detalle de la réplica"
      aria-label={`Ver detalle de la réplica #${id}`}
      className={`${styles.hiveCell} ${pulseVersion > 0 ? styles.hiveActivityPulse : ""}`}
      style={style}
    >
      <div className={styles.hiveCellInner}>
        <div className="flex items-center gap-1.5 font-mono text-[13px] font-bold text-[var(--color-fg-0)]">
          <BeeIcon size={16} />
          Réplica #{id}
        </div>
        <span className={`mt-1 inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-[2px] text-[10px] font-bold ${operational ? "border-[var(--color-online)] text-[var(--color-online)]" : "border-[var(--color-border-strong)] text-[var(--color-fg-3)]"}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {pipelineStatusLabel(status)}
        </span>
        <p className={`mt-3 text-[32px] font-black leading-none ${operational ? "text-[var(--color-fg-0)]" : "text-[var(--color-fg-3)]"}`}>{formatNumber(delivered)}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-fg-2)]">mensajes entregados</p>
        <p className="mt-auto text-[11px] text-[var(--color-fg-2)]"><span className="uppercase tracking-wide text-[10px]">Actividad</span><br /><span className="font-bold text-[var(--color-fg-0)]">{activity}</span></p>
      </div>
    </button>
  );
}

function ReplicaHive({
  replicas,
  onViewDetail,
}: {
  replicas: StatusReplica[];
  onViewDetail: (id: number) => void;
}) {
  const columns = Math.min(replicas.length, 4);
  const rows = Math.ceil(replicas.length / columns);
  const cellWidth = 232;
  const cellHeight = 200;
  const columnOffset = 174;
  const hasMultipleColumns = columns > 1;
  const canvasWidth = cellWidth + (columns - 1) * columnOffset;
  const canvasHeight = rows * cellHeight + (hasMultipleColumns ? 100 : 0);

  return (
    <div className={styles.hiveViewport}>
      <div className={styles.hiveCanvas} style={{ height: canvasHeight, width: canvasWidth }}>
        {replicas.map((replica, index) => {
          const column = index % columns;
          const row = Math.floor(index / columns);
          const position = {
            left: column * columnOffset,
            top: row * cellHeight + (hasMultipleColumns && column % 2 === 0 ? 100 : 0),
          };
          const replicaTelemetry = summarizeFlowTelemetry([replica]);

          return (
            <ReplicaHiveCell
              key={replica.replica_id}
              id={replica.replica_id}
              status={replica.status}
              lastProcessedAt={replica.last_processed_at}
              delivered={replicaTelemetry.delivered.count}
              onViewDetail={() => onViewDetail(replica.replica_id)}
              style={position}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function PipelineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pid = Number(id);
  const pipelineQ = usePipeline(pid);
  const {
    data: allStatus,
    isPending: statusPending,
    isError: statusError,
  } = usePipelineStatusAll();

  const updateGroup = useUpdatePipelineGroup(pid);
  const updateReplicas = useUpdatePipelineReplicas(pid);
  const license = useLicenseStatus();

  const st = allStatus?.find((s) => s.pipeline_id === pid);
  const [selectedReplicaId, setSelectedReplicaId] = useState<number | null>(
    null,
  );
  const [replicaView, setReplicaView] = useState<"cards" | "hive">("cards");

  if (pipelineQ.isPending) return <HoneycombLoader label="Cargando proyecto" />;
  if (pipelineQ.isError || !pipelineQ.data) {
    return (
      <Panel tone="danger">
        <div className="flex flex-wrap items-center justify-between gap-3" role="alert">
          <div>
            <h1 className="font-semibold text-[var(--color-fg-0)]">No pudimos cargar el proyecto</h1>
            <p className="mt-1 text-[14px] text-[var(--color-fg-2)]">Reintenta o vuelve a la lista de proyectos.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => void pipelineQ.refetch()}>Reintentar</Button>
            <Link href="/pipelines"><Button variant="ghost">Volver</Button></Link>
          </div>
        </div>
      </Panel>
    );
  }
  const p = pipelineQ.data;
  const general = st?.pipeline_general_status;
  const replicas =
    st?.replicas ??
    Object.entries(st?.replica_statuses ?? {}).map(([rid, rstatus]) => ({
      replica_id: Number(rid),
      status: String(rstatus),
      last_processed_at: null,
      last_error: null,
    }));
  const statusUnavailable = statusError || (!statusPending && !general);
  const statusReady = !statusPending && !statusUnavailable;
  const firstReplicaError = statusReady ? replicas.find((r) => r.last_error)?.last_error : undefined;
  const activeReplicaCount = statusReady ? replicas.filter((r) =>
    isActiveReplica(r.status),
  ).length : 0;
  const isDegraded =
    general?.toLowerCase() === "degraded" ||
    statusReady && replicas.some((r) => r.status?.toLowerCase() === "degraded");
  const telemetry = summarizeFlowTelemetry(replicas);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <HexIcon size={22} filled />
          <h1 className="t-title">{p.name}</h1>
          <PipelineStatusPill
            status={general}
            isPending={statusPending}
            isUnavailable={statusUnavailable}
          />
        </div>
        <div className="flex items-center gap-2">
          <Link href="/pipelines">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft size={14} aria-hidden="true" />
              Volver
            </Button>
          </Link>
          <PipelineActions id={p.id} name={p.name} status={general} />
        </div>
      </div>
      <p className="text-sm text-[var(--color-fg-3)] mb-4">
        Proyecto #{fmtId(p.id)}
      </p>

      {statusUnavailable && (
        <Panel className="mb-4">
          <div role="status" aria-live="polite">El estado operativo no está disponible. Espera un momento antes de tomar decisiones sobre las réplicas o las métricas.</div>
        </Panel>
      )}

      <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
        <h2 className="t-section font-bold">RÉPLICAS</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className="t-mono text-[12px] text-[var(--color-fg-3)]">
            {statusReady ? `${activeReplicaCount} activa${activeReplicaCount === 1 ? "" : "s"} / ${p.replicationFactor} configurada${p.replicationFactor === 1 ? "" : "s"}` : "Estado en actualización"}
          </span>
          <div className="inline-flex items-center gap-1" role="group" aria-label="Vista de réplicas">
            <button
              type="button"
              aria-pressed={replicaView === "cards"}
              aria-label="Vista de tarjetas"
              title="Vista de tarjetas"
              onClick={() => setReplicaView("cards")}
              className={`grid h-6 w-6 place-items-center transition-colors ${replicaView === "cards" ? "text-[var(--color-accent)]" : "text-[var(--color-fg-4)] hover:text-[var(--color-fg-1)]"}`}
            >
              <LayoutGrid size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-pressed={replicaView === "hive"}
              aria-label="Vista de colmena"
              title="Vista de colmena"
              onClick={() => setReplicaView("hive")}
              className={`grid h-6 w-6 place-items-center transition-colors ${replicaView === "hive" ? "text-[var(--color-accent)]" : "text-[var(--color-fg-4)] hover:text-[var(--color-fg-1)]"}`}
            >
              <HexIcon size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      <div className="mb-4">
        <RescaleControl
          currentValue={p.replicationFactor}
          onApply={(v) =>
            updateReplicas.mutateAsync(v).then(
              () => undefined,
              () => undefined,
            )
          }
          pipelineStatus={general}
          maxValue={license.data?.limits.maxReplicasPerPipeline}
        />
      </div>

      {(isDegraded || firstReplicaError) && (
        <Panel className="border-[var(--color-danger)] mb-4">
          <div className="text-[14px] text-[var(--color-danger)] mb-2">
            PROYECTO CON DEGRADACIÓN
          </div>
          <p className="text-[13px] text-[var(--color-fg-2)] mb-3 whitespace-pre-wrap break-all">
            {firstReplicaError ?? "Una o más réplicas presentan degradación."}
          </p>
          <div className="text-[11px] text-[var(--color-fg-4)]">
            Revisa los registros del backend: <code>RUST_LOG=iot_bee=debug</code>
          </div>
        </Panel>
      )}

      {statusReady && replicas.length > 0 && (
        replicaView === "cards" ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {replicas.map((r) => {
              const replicaTelemetry = summarizeFlowTelemetry([r]);

              return (
                <ReplicaCard
                  key={r.replica_id}
                  id={r.replica_id}
                  status={r.status}
                  lastProcessedAt={r.last_processed_at}
                  delivered={replicaTelemetry.delivered.count}
                  onViewDetail={() => setSelectedReplicaId(r.replica_id)}
                />
              );
            })}
          </div>
        ) : (
          <ReplicaHive replicas={replicas} onViewDetail={setSelectedReplicaId} />
        )
      )}

      <section className="mb-6 mt-6">
        <div className="mb-3">
          <h2 className="t-section font-bold">Flujo de datos</h2>
        </div>
        <PipelineFlowEditor
          pipeline={p}
          pipelineStatus={general}
          replicas={replicas}
          telemetryPending={statusPending}
          telemetryUnavailable={statusUnavailable}
        />
      </section>

      <section className="mb-6">
        <Panel className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div>
            <div className="t-label">GRUPO DE CLIENTE</div>
            <div className="mt-1 font-bold">{p.pipelineGroup?.name ?? "—"}</div>
            <p className="mt-0.5 text-[12px] text-[var(--color-fg-3)]">
              Organización operativa a la que pertenece este proyecto.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <EditFieldButton
              label="group"
              currentId={p.pipelineGroup?.id}
              onChange={(newId) =>
                updateGroup.mutateAsync(newId).then(
                  () => undefined,
                  () => undefined,
                )
              }
              pipelineStatus={general}
            />
          </div>
        </Panel>
      </section>

      <Modal
        open={selectedReplicaId !== null}
        onClose={() => setSelectedReplicaId(null)}
        className="max-w-[680px] max-h-[calc(100vh-2rem)] overflow-y-auto"
      >
        {(() => {
          const r = replicas.find((x) => x.replica_id === selectedReplicaId);
          if (!r) return null;
          const replicaTelemetry = summarizeFlowTelemetry([r]);
          return (
            <div className="p-6 sm:p-7">
              <div className="flex items-center justify-between mb-5 gap-3">
                <div className="flex items-center gap-2.5">
                  <BeeIcon size={22} />
                  <h3 className="t-section text-[20px]">
                    Réplica #{r.replica_id}
                  </h3>
                </div>
                <Pill state={toPillState(r.status)}>
                  {pipelineStatusLabel(r.status)}
                </Pill>
              </div>
              <p className="t-mono text-[13px] mb-5 text-[var(--color-fg-3)]">
                Proyecto {p.name} · #{fmtId(p.id)}
              </p>
              <dl className="mb-5 overflow-hidden rounded-[3px] border border-[var(--color-border-subtle)] divide-y divide-[var(--color-border-subtle)]">
                <ReplicaDetailRow label="STATUS" value={r.status} />
                <ReplicaDetailRow label="ÚLTIMO PROCESAMIENTO" value={formatDateTime(r.last_processed_at)} />
                <ReplicaDetailRow label="ÚLTIMA ACTIVIDAD" value={`Hace ${formatRelativeTime(r.last_processed_at)}`} />
                <ReplicaDetailRow label="RECIBIDOS" value={formatNumber(replicaTelemetry.received.count)} />
                <ReplicaDetailRow label="PROCESADOS" value={formatNumber(replicaTelemetry.validated.count)} />
                <ReplicaDetailRow label="ENTREGADOS" value={formatNumber(replicaTelemetry.delivered.count)} tone="online" />
                <ReplicaDetailRow
                  label="ÉXITO DE ENTREGA"
                  value={replicaTelemetry.successRate === null ? "—" : `${replicaTelemetry.successRate.toLocaleString("es-CO", { maximumFractionDigits: 1 })}%`}
                  tone={replicaTelemetry.successRate === 100 ? "online" : "default"}
                />
                {replicaTelemetry.rejected.count > 0 && (
                  <ReplicaDetailRow
                    label="RECHAZADOS"
                    value={formatNumber(replicaTelemetry.rejected.count)}
                    tone="danger"
                  />
                )}
              </dl>
              {r.last_error && (
                <div className="border border-[var(--color-danger)] p-4 rounded-[2px] mb-4">
                  <div className="text-[13px] font-semibold text-[var(--color-danger)] mb-1">
                    ÚLTIMO ERROR
                  </div>
                  <p className="text-[14px] font-mono whitespace-pre-wrap break-all text-[var(--color-fg-2)]">
                    {r.last_error}
                  </p>
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setSelectedReplicaId(null)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

function PipelineStatusPill({
  status,
  isPending,
  isUnavailable,
}: {
  status?: string;
  isPending: boolean;
  isUnavailable: boolean;
}) {
  if (isUnavailable) return <Pill state="starting">SIN ESTADO</Pill>;
  if (isPending) return <Pill state="starting">ACTUALIZANDO</Pill>;
  const label = pipelineStatusLabel(status);
  return (
    <Pill state={toPillState(status)}>
      {label === "OPERATIVO" ? <span className="font-bold">{label}</span> : label}
    </Pill>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}

function ReplicaDetailRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "online" | "danger";
}) {
  return (
    <div className="grid grid-cols-[minmax(150px,1fr)_auto] items-center gap-5 bg-[var(--color-bg-panel)] px-4 py-3.5 text-[15px] sm:px-5 sm:py-4">
      <dt className="font-mono text-[12px] font-semibold tracking-[0.06em] text-[var(--color-fg-3)]">{"// "}{label}</dt>
      <dd className={`font-mono text-right text-[16px] font-bold ${tone === "online" ? "text-[var(--color-online)]" : tone === "danger" ? "text-[var(--color-danger)]" : "text-[var(--color-fg-0)]"}`}>
        {value}
      </dd>
    </div>
  );
}

function formatRelativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "—";

  const seconds = Math.max(0, Math.floor((now - time) / 1000));
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)} h`;
  return `${Math.floor(seconds / 86_400)} d`;
}
