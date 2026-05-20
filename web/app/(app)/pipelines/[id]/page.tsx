"use client";
import { use, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { RowSkeleton } from "@/components/ui/RowSkeleton";
import { Modal } from "@/components/ui/Modal";
import { BeeIcon } from "@/components/ui/icons/BeeIcon";
import { HexIcon } from "@/components/ui/icons/HexIcon";
import { PipelineActions } from "@/components/pipelines/PipelineActions";
import { EditFieldButton } from "@/components/pipelines/EditFieldButton";
import { RescaleControl } from "@/components/pipelines/RescaleControl";
import {
  usePipeline,
  useUpdatePipelineGroup,
  useUpdatePipelineReplicas,
  useUpdatePipelineSchema,
  useUpdatePipelineSource,
  useUpdatePipelineStore,
} from "@/lib/hooks/usePipelines";
import { usePipelineStatusAll } from "@/lib/hooks/usePipelineStatusAll";
import { useSources } from "@/lib/hooks/useSources";
import { useStores } from "@/lib/hooks/useStores";
import { useSchemas } from "@/lib/hooks/useSchemas";
import { useGroups } from "@/lib/hooks/useGroups";
import { fmtId, timeAgo } from "@/lib/fmt";
import { toPillState } from "@/lib/status";

export default function PipelineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pid = Number(id);
  const { data: p } = usePipeline(pid);
  const { data: allStatus } = usePipelineStatusAll();
  const sources = useSources();
  const stores = useStores();
  const schemas = useSchemas();
  const groups = useGroups();

  const updateSource = useUpdatePipelineSource(pid);
  const updateStore = useUpdatePipelineStore(pid);
  const updateSchema = useUpdatePipelineSchema(pid);
  const updateGroup = useUpdatePipelineGroup(pid);
  const updateReplicas = useUpdatePipelineReplicas(pid);

  const st = allStatus?.find((s) => s.pipeline_id === pid);
  const [selectedReplicaId, setSelectedReplicaId] = useState<number | null>(
    null,
  );

  if (!p) return <RowSkeleton variant="panel" />;
  const general = st?.pipeline_general_status;
  const replicas =
    st?.replicas ??
    Object.entries(st?.replica_statuses ?? {}).map(([rid, rstatus]) => ({
      replica_id: Number(rid),
      status: String(rstatus),
      last_processed_at: null,
      last_error: null,
    }));
  const firstReplicaError = replicas.find((r) => r.last_error)?.last_error;
  const isDegraded =
    general?.toLowerCase() === "degraded" ||
    replicas.some((r) => r.status?.toLowerCase() === "degraded");

  return (
    <div>
      <Breadcrumbs
        trail={[
          { label: "pipelines", href: "/pipelines" },
          { label: p.name },
        ]}
      />
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <HexIcon size={22} filled />
        <h1 className="t-title">{p.name}</h1>
        <Pill state={toPillState(general)}>
          {(general ?? "STOPPED").toUpperCase()}
        </Pill>
      </div>
      <p className="t-mono mb-4">
        {"// "}pipeline #{fmtId(p.id)} · {p.replicationFactor} replicas
      </p>
      <div className="flex gap-3 items-center mb-6 flex-wrap">
        <PipelineActions id={p.id} name={p.name} status={general} />
        <Link href="/pipelines">
          <Button variant="ghost" size="sm">back to list</Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Panel>
          <div className="flex items-center justify-between">
            <div className="t-label">{"// "}SOURCE</div>
            <EditFieldButton
              label="source"
              currentId={p.dataSource?.id}

              onChange={(newId) =>
                updateSource.mutateAsync(newId).then(
                  () => undefined,
                  () => undefined,
                )
              }
              pipelineStatus={general}
            />
          </div>
          <div className="mt-1 font-bold">{p.dataSource?.name ?? "—"}</div>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between">
            <div className="t-label">{"// "}SCHEMA</div>
            <EditFieldButton
              label="schema"
              currentId={p.dataValidationSchema?.id}

              onChange={(newId) =>
                updateSchema.mutateAsync(newId).then(
                  () => undefined,
                  () => undefined,
                )
              }
              pipelineStatus={general}
            />
          </div>
          <div className="mt-1 font-bold">
            {p.dataValidationSchema?.name ?? "—"}
          </div>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between">
            <div className="t-label">{"// "}STORE</div>
            <EditFieldButton
              label="store"
              currentId={p.dataStore?.id}

              onChange={(newId) =>
                updateStore.mutateAsync(newId).then(
                  () => undefined,
                  () => undefined,
                )
              }
              pipelineStatus={general}
            />
          </div>
          <div className="mt-1 font-bold">{p.dataStore?.name ?? "—"}</div>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between">
            <div className="t-label">{"// "}GROUP</div>
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
          <div className="mt-1 font-bold">{p.pipelineGroup?.name ?? "—"}</div>
        </Panel>
      </div>

      <h2 className="t-section mb-3">{"// "}replicas</h2>
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
        />
      </div>

      {(isDegraded || firstReplicaError) && (
        <Panel className="border-[var(--color-danger)] mb-4">
          <div className="text-[14px] text-[var(--color-danger)] mb-2">
            {"// "}PIPELINE DEGRADED
          </div>
          <p className="text-[13px] text-[var(--color-fg-2)] mb-3 whitespace-pre-wrap break-all">
            {firstReplicaError ?? "one or more replicas are degraded"}
          </p>
          <div className="text-[11px] text-[var(--color-fg-4)]">
            check backend logs: <code>RUST_LOG=iot_bee=debug</code>
          </div>
        </Panel>
      )}

      {replicas.length > 0 && (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {replicas.map((r) => (
            <Panel key={r.replica_id} className="p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[13px] flex items-center gap-1.5">
                  <BeeIcon size={14} />
                  replica #{r.replica_id}
                </span>
                <div className="flex items-center gap-1.5">
                  <Pill state={toPillState(r.status)}>
                    {r.status.toUpperCase()}
                  </Pill>
                  <button
                    type="button"
                    onClick={() => setSelectedReplicaId(r.replica_id)}
                    title="view replica detail"
                    aria-label={`view detail for replica #${r.replica_id}`}
                    className="p-1 text-[var(--color-fg-3)] hover:text-[var(--color-accent)] transition-colors"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>
              <span className="text-[11px] text-[var(--color-fg-3)]">
                active {timeAgo(r.last_processed_at)}
              </span>
            </Panel>
          ))}
        </div>
      )}

      <Modal
        open={selectedReplicaId !== null}
        onClose={() => setSelectedReplicaId(null)}
      >
        {(() => {
          const r = replicas.find((x) => x.replica_id === selectedReplicaId);
          if (!r) return null;
          return (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-2">
                  <BeeIcon size={18} />
                  <h3 className="t-section">
                    replica #{r.replica_id}
                  </h3>
                </div>
                <Pill state={toPillState(r.status)}>
                  {r.status.toUpperCase()}
                </Pill>
              </div>
              <p className="t-mono text-[11px] mb-4 text-[var(--color-fg-3)]">
                {"// "}pipeline {p.name} · #{fmtId(p.id)}
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[12px] mb-3">
                <dt className="t-label">{"// "}STATUS</dt>
                <dd className="font-mono">{r.status}</dd>
                <dt className="t-label">{"// "}LAST PROCESSED</dt>
                <dd className="font-mono">
                  {r.last_processed_at ?? "—"}
                </dd>
                <dt className="t-label">{"// "}ACTIVE</dt>
                <dd className="font-mono">{timeAgo(r.last_processed_at)}</dd>
              </dl>
              {r.last_error && (
                <div className="border border-[var(--color-danger)] p-3 rounded-[2px] mb-3">
                  <div className="text-[11px] text-[var(--color-danger)] mb-1">
                    {"// "}LAST ERROR
                  </div>
                  <p className="text-[12px] font-mono whitespace-pre-wrap break-all text-[var(--color-fg-2)]">
                    {r.last_error}
                  </p>
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedReplicaId(null)}
                >
                  close
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
