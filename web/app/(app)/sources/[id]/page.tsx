"use client";
import { use } from "react";
import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { RowSkeleton } from "@/components/ui/RowSkeleton";
import { useSource } from "@/lib/hooks/useSources";
import {
  useBlockingPipelines,
  type BlockingPipeline,
} from "@/lib/hooks/useBlockedEntities";
import { fmtId } from "@/lib/fmt";

function lockMessage(resource: string, blocking: BlockingPipeline[]): string {
  const head = blocking[0];
  const extra = blocking.length > 1 ? ` (+${blocking.length - 1} more)` : "";
  return `cannot edit ${resource} — pipeline "${head.name}" (#${head.id}) is ${head.status.toLowerCase()}${extra}. stop it first.`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 items-baseline text-[13px] font-mono">
      <div className="text-[var(--color-fg-3)] uppercase tracking-[1px]">{label}</div>
      <div className="text-[var(--color-fg-1)] break-all">{value}</div>
    </div>
  );
}

export default function ViewSourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  const { data, isLoading } = useSource(numericId);
  const { pipelines: blocking } = useBlockingPipelines("source", numericId);
  if (isLoading || !data) return <RowSkeleton variant="panel" />;
  const locked = blocking.length > 0;

  let connection: React.ReactNode = null;
  if (data.sourceType === "RABBIT_MQ") {
    const c = data.config as { url?: string; queue_name?: string; consumer_name?: string };
    connection = (
      <>
        <Row label="url" value={c.url ?? "—"} />
        <Row label="queue_name" value={c.queue_name ?? "—"} />
        <Row label="consumer_name" value={c.consumer_name ?? "—"} />
      </>
    );
  } else if (data.sourceType === "MQTT") {
    const c = data.config as { broker_url?: string; topic?: string; client_id?: string };
    connection = (
      <>
        <Row label="broker_url" value={c.broker_url ?? "—"} />
        <Row label="topic" value={c.topic ?? "—"} />
        <Row label="client_id" value={c.client_id ?? "—"} />
      </>
    );
  } else if (data.sourceType === "KAFKA") {
    const c = data.config as { brokers?: string[]; topic?: string; group_id?: string };
    connection = (
      <>
        <Row label="brokers" value={(c.brokers ?? []).join(", ") || "—"} />
        <Row label="topic" value={c.topic ?? "—"} />
        <Row label="group_id" value={c.group_id ?? "—"} />
      </>
    );
  }

  return (
    <div>
      <Breadcrumbs
        trail={[
          { label: "sources", href: "/sources" },
          { label: data.name },
        ]}
      />
      <h1 className="t-title mb-1">{data.name}</h1>
      <p className="t-mono mb-4">
        {"// "}data source · #{fmtId(data.id)} · {data.sourceType}
      </p>

      <div className="flex gap-3 items-center mb-6 flex-wrap">
        {locked ? (
          <Button
            variant="ghost"
            size="sm"
            disabled
            title={lockMessage("data source", blocking)}
          >
            🔒 EDIT
          </Button>
        ) : (
          <Link href={`/sources/${data.id}/edit`}>
            <Button variant="primary" size="sm">EDIT</Button>
          </Link>
        )}
        <Link href="/sources">
          <Button variant="ghost" size="sm">back to list</Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Panel>
          <div className="t-label mb-3">{"// "}METADATA</div>
          <div className="flex flex-col gap-2">
            <Row label="id" value={`#${data.id}`} />
            <Row label="name" value={data.name} />
            <Row label="source_type" value={data.sourceType} />
            <Row label="description" value={data.dataSourceDescription || "—"} />
          </div>
        </Panel>
        <Panel>
          <div className="t-label mb-3">{"// "}CONNECTION</div>
          <div className="flex flex-col gap-2">{connection}</div>
        </Panel>
      </div>
    </div>
  );
}
