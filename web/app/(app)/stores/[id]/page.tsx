"use client";
import { use } from "react";
import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { RowSkeleton } from "@/components/ui/RowSkeleton";
import { useStore } from "@/lib/hooks/useStores";
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

function maskToken(token: string | undefined): string {
  if (!token) return "—";
  if (token.length <= 6) return "•".repeat(token.length);
  return `${token.slice(0, 3)}${"•".repeat(token.length - 6)}${token.slice(-3)}`;
}

export default function ViewStorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  const { data, isLoading } = useStore(numericId);
  const { pipelines: blocking } = useBlockingPipelines("store", numericId);
  if (isLoading || !data) return <RowSkeleton variant="panel" />;
  const locked = blocking.length > 0;

  let persistence: React.ReactNode = null;
  if (data.storeType === "INFLUX_DB") {
    const c = data.config as {
      url?: string;
      data_base?: string;
      measurement?: string;
      token?: string;
      tag_fields?: string[];
    };
    persistence = (
      <>
        <Row label="url" value={c.url ?? "—"} />
        <Row label="database" value={c.data_base ?? "—"} />
        <Row label="measurement" value={c.measurement ?? "—"} />
        <Row label="token" value={maskToken(c.token)} />
        <Row label="tag_fields" value={(c.tag_fields ?? []).join(", ") || "—"} />
      </>
    );
  } else if (data.storeType === "LOCAL_LOG") {
    const c = data.config as { log_name?: string };
    persistence = <Row label="log_name" value={c.log_name ?? "—"} />;
  }

  return (
    <div>
      <Breadcrumbs
        trail={[
          { label: "stores", href: "/stores" },
          { label: data.name },
        ]}
      />
      <h1 className="t-title mb-1">{data.name}</h1>
      <p className="t-mono mb-4">
        {"// "}data store · #{fmtId(data.id)} · {data.storeType}
      </p>

      <div className="flex gap-3 items-center mb-6 flex-wrap">
        {locked ? (
          <Button
            variant="ghost"
            size="sm"
            disabled
            title={lockMessage("data store", blocking)}
          >
            🔒 EDIT
          </Button>
        ) : (
          <Link href={`/stores/${data.id}/edit`}>
            <Button variant="primary" size="sm">EDIT</Button>
          </Link>
        )}
        <Link href="/stores">
          <Button variant="ghost" size="sm">back to list</Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Panel>
          <div className="t-label mb-3">{"// "}METADATA</div>
          <div className="flex flex-col gap-2">
            <Row label="id" value={`#${data.id}`} />
            <Row label="name" value={data.name} />
            <Row label="store_type" value={data.storeType} />
            <Row label="description" value={data.dataStoreDescription || "—"} />
          </div>
        </Panel>
        <Panel>
          <div className="t-label mb-3">{"// "}PERSISTENCE</div>
          <div className="flex flex-col gap-2">{persistence}</div>
        </Panel>
      </div>
    </div>
  );
}
