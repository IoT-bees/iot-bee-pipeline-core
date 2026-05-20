"use client";
import { use } from "react";
import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { RowSkeleton } from "@/components/ui/RowSkeleton";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { useSchema } from "@/lib/hooks/useSchemas";
import {
  useBlockingPipelines,
  type BlockingPipeline,
} from "@/lib/hooks/useBlockedEntities";
import { printFormula } from "@/lib/ast/printFormula";
import { fromBackend } from "@/lib/ast/serialize";
import { fmtId } from "@/lib/fmt";
import type { FieldSchema } from "@/lib/api/types";

function lockMessage(resource: string, blocking: BlockingPipeline[]): string {
  const head = blocking[0];
  const extra = blocking.length > 1 ? ` (+${blocking.length - 1} more)` : "";
  return `cannot edit ${resource} — pipeline "${head.name}" (#${head.id}) is ${head.status.toLowerCase()}${extra}. stop it first.`;
}

function fmtRange(v?: { min?: number; max?: number } | null): string {
  if (!v || (v.min === undefined && v.max === undefined)) return "—";
  const lo = v.min ?? "−∞";
  const hi = v.max ?? "+∞";
  return `[${lo} … ${hi}]`;
}

function fmtFormula(op?: Record<string, unknown> | null): string {
  if (!op) return "—";
  const expr = fromBackend(op);
  return expr ? printFormula(expr) : "—";
}

function fmtDefault(d: FieldSchema["default"]): string {
  if (d === null || d === undefined) return "—";
  return String(d);
}

export default function ViewSchemaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  const { data, isLoading } = useSchema(numericId);
  const { pipelines: blocking } = useBlockingPipelines("schema", numericId);
  if (isLoading || !data) return <RowSkeleton variant="panel" />;
  const locked = blocking.length > 0;
  const entries = Object.entries(data.schema ?? {});

  return (
    <div>
      <Breadcrumbs
        trail={[
          { label: "schemas", href: "/schemas" },
          { label: data.name },
        ]}
      />
      <h1 className="t-title mb-1">{data.name}</h1>
      <p className="t-mono mb-4">
        {"// "}validation schema · #{fmtId(data.id)} · {entries.length} field
        {entries.length === 1 ? "" : "s"}
      </p>

      <div className="flex gap-3 items-center mb-6 flex-wrap">
        {locked ? (
          <Button
            variant="ghost"
            size="sm"
            disabled
            title={lockMessage("validation schema", blocking)}
          >
            🔒 EDIT
          </Button>
        ) : (
          <Link href={`/schemas/${data.id}/edit`}>
            <Button variant="primary" size="sm">EDIT</Button>
          </Link>
        )}
        <Link href="/schemas">
          <Button variant="ghost" size="sm">back to list</Button>
        </Link>
      </div>

      {entries.length === 0 ? (
        <Panel>
          <div className="t-mono">{"// "}schema has no fields</div>
        </Panel>
      ) : (
        <Table>
          <THead>
            <TH>FIELD</TH>
            <TH>TYPE</TH>
            <TH>REQ</TH>
            <TH>DEFAULT</TH>
            <TH>BOUNDS</TH>
            <TH>FORMULA</TH>
          </THead>
          <tbody>
            {entries.map(([name, fs]) => (
              <TR key={name}>
                <TD className="font-bold">{name}</TD>
                <TD>{fs.type}</TD>
                <TD>{fs.required ? "yes" : "no"}</TD>
                <TD>{fmtDefault(fs.default)}</TD>
                <TD>{fmtRange(fs.validation)}</TD>
                <TD className="font-mono text-[12px]">{fmtFormula(fs.operation)}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-[12px] font-mono text-[var(--color-fg-3)]">
          ▸ raw JSON
        </summary>
        <pre className="mt-2 text-[11px] font-mono text-[var(--color-fg-2)] whitespace-pre overflow-x-auto p-3 border border-[#2a2a2a] rounded-[2px] bg-[var(--color-bg-panel)]">
{JSON.stringify(data.schema, null, 2)}
        </pre>
      </details>
    </div>
  );
}
