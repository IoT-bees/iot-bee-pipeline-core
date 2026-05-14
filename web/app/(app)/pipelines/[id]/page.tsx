"use client";
import { use } from "react";
import Link from "next/link";

import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { PipelineActions } from "@/components/pipelines/PipelineActions";
import { usePipeline } from "@/lib/hooks/usePipelines";
import { usePipelineStatusAll } from "@/lib/hooks/usePipelineStatusAll";
import { fmtId } from "@/lib/fmt";
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
  const st = allStatus?.find((s) => s.pipeline_id === pid);

  if (!p) return <div className="t-mono">{"// "}loading…</div>;
  const general = st?.pipeline_general_status;
  const replicaEntries = Object.entries(st?.replica_statuses ?? {});

  return (
    <div>
      <div className="flex items-center gap-3 mb-2 flex-wrap">
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
          <div className="t-label">{"// "}SOURCE</div>
          <div className="mt-1 font-bold">{p.dataSource?.name ?? "—"}</div>
        </Panel>
        <Panel>
          <div className="t-label">{"// "}SCHEMA</div>
          <div className="mt-1 font-bold">
            {p.dataValidationSchema?.name ?? "—"}
          </div>
        </Panel>
        <Panel>
          <div className="t-label">{"// "}STORE</div>
          <div className="mt-1 font-bold">{p.dataStore?.name ?? "—"}</div>
        </Panel>
        <Panel>
          <div className="t-label">{"// "}GROUP</div>
          <div className="mt-1 font-bold">{p.pipelineGroup?.name ?? "—"}</div>
        </Panel>
      </div>

      {replicaEntries.length > 0 && (
        <>
          <h2 className="t-section mb-3">{"// "}replicas</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {replicaEntries.map(([rid, rstatus]) => (
              <Panel key={rid} className="p-3 flex items-center justify-between">
                <span className="font-mono text-[13px]">replica #{rid}</span>
                <Pill state={toPillState(rstatus)}>
                  {String(rstatus).toUpperCase()}
                </Pill>
              </Panel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
