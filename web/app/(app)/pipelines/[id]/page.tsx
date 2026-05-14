"use client";
import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Panel } from "@/components/ui/Panel";
import { Pill, type PillState } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { usePipeline } from "@/lib/hooks/usePipelines";
import { useStartPipeline } from "@/lib/hooks/useStartPipeline";
import { useStopPipeline } from "@/lib/hooks/useStopPipeline";
import { sourcesApi } from "@/lib/api/endpoints/sources";
import { storesApi } from "@/lib/api/endpoints/stores";
import { schemasApi } from "@/lib/api/endpoints/schemas";
import { lifecycleApi } from "@/lib/api/endpoints/lifecycle";

function toPill(s?: string): PillState {
  if (s === "Running") return "running";
  if (s === "Error") return "error";
  return "idle";
}

export default function PipelineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pid = Number(id);
  const { data: p } = usePipeline(pid);

  const { data: st } = useQuery({
    queryKey: ["pipelines", "status", pid],
    queryFn: () => lifecycleApi.status(pid),
    refetchInterval: 5000,
    enabled: pid > 0,
  });

  const source = useQuery({
    queryKey: ["sources", p?.data_source_id],
    queryFn: () => sourcesApi.get(p!.data_source_id!),
    enabled: !!p?.data_source_id,
  });
  const store = useQuery({
    queryKey: ["stores", p?.data_store_id],
    queryFn: () => storesApi.get(p!.data_store_id!),
    enabled: !!p?.data_store_id,
  });
  const schema = useQuery({
    queryKey: ["schemas", p?.validation_schema_id],
    queryFn: () => schemasApi.get(p!.validation_schema_id!),
    enabled: !!p?.validation_schema_id,
  });

  const start = useStartPipeline();
  const stop = useStopPipeline();

  if (!p) return <div className="t-mono">{"// "}loading…</div>;
  const running = st?.status === "Running";
  return (
    <div>
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <h1 className="t-title">{p.name}</h1>
        <Pill state={toPill(st?.status)}>
          {(st?.status ?? "STOPPED").toUpperCase()}
        </Pill>
      </div>
      <p className="t-mono mb-4">
        {"// "}pipeline #{String(p.id).padStart(2, "0")} · {p.replication} replicas
      </p>
      <div className="flex gap-3 items-center mb-6 flex-wrap">
        {running ? (
          <Button variant="danger" onClick={() => stop.mutate(p.id)}>
            ■ STOP
          </Button>
        ) : (
          <Button variant="primary" onClick={() => start.mutate(p.id)}>
            ▸ START
          </Button>
        )}
        <Link href="/pipelines">
          <Button variant="ghost">back</Button>
        </Link>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <Panel>
          <div className="t-label">{"// "}SOURCE</div>
          <div className="mt-1">
            {source.data?.name ?? <span className="text-[var(--color-fg-3)]">none</span>}
          </div>
        </Panel>
        <Panel>
          <div className="t-label">{"// "}SCHEMA</div>
          <div className="mt-1">
            {schema.data?.name ?? <span className="text-[var(--color-fg-3)]">none</span>}
          </div>
        </Panel>
        <Panel>
          <div className="t-label">{"// "}STORE</div>
          <div className="mt-1">
            {store.data?.name ?? <span className="text-[var(--color-fg-3)]">none</span>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
