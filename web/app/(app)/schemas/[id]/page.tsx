"use client";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { useSchema } from "@/lib/hooks/useSchemas";
import { useBlockingPipelines } from "@/lib/hooks/useBlockedEntities";
import { printFormula } from "@/lib/ast/printFormula";
import { fromBackend } from "@/lib/ast/serialize";
import { fmtId } from "@/lib/fmt";
import type { FieldSchema } from "@/lib/api/types";

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

function RequiredStatus({ required }: { required: boolean }) {
  return (
    <Pill state={required ? "running" : "error"}>
      {required ? "SÍ" : "NO"}
    </Pill>
  );
}

export default function ViewSchemaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  const { data, isLoading, isError, error } = useSchema(numericId);
  const { pipelines: blocking } = useBlockingPipelines("schema", numericId);
  if (isLoading) return <HoneycombLoader label="Cargando definición" />;
  if (isError || !data) {
    return (
      <Panel tone="danger" className="max-w-[640px]">
        <h1 className="t-title">No pudimos abrir la definición</h1>
        <p className="mt-2 text-[14px] text-[var(--color-fg-2)]">{error instanceof Error ? error.message : "La definición no existe o ya no está disponible."}</p>
        <Link href="/schemas" className="mt-4 inline-flex"><Button variant="ghost" className="gap-2"><ArrowLeft size={16} aria-hidden="true" />Volver</Button></Link>
      </Panel>
    );
  }
  const locked = blocking.length > 0;
  const entries = Object.entries(data.schema ?? {});

  return (
    <div>
      <h1 className="t-title mb-1">{data.name}</h1>
      <p className="text-sm text-[var(--color-fg-3)] mb-4">
        Esquema #{fmtId(data.id)} · {entries.length} campo{entries.length === 1 ? "" : "s"}
      </p>

      <div className="flex gap-3 items-center mb-6 flex-wrap">
        <Link href="/schemas">
          <Button variant="ghost" size="sm" className="gap-2"><ArrowLeft size={15} aria-hidden="true" />Volver</Button>
        </Link>
        <Link href={`/schemas/${data.id}/edit`}>
          <Button variant="primary" size="sm">Editar</Button>
        </Link>
      </div>
      {locked && (
        <p className="mb-6 text-[13px] text-[var(--color-fg-3)]">
          Esta definición está en uso por {blocking.length === 1 ? "un proyecto activo" : `${blocking.length} proyectos activos`}. Puedes revisar el formulario; detén los proyectos antes de guardar cambios.
        </p>
      )}

      {entries.length === 0 ? (
        <Panel>
          <div className="text-sm text-[var(--color-fg-3)]">Este esquema todavía no tiene campos.</div>
        </Panel>
      ) : (
        <>
        <div className="hidden md:block"><Table>
          <THead>
            <TH>CAMPO</TH>
            <TH>TIPO</TH>
            <TH>OBLIG.</TH>
            <TH>PREDETERM.</TH>
            <TH>RANGO</TH>
            <TH>FÓRMULA</TH>
          </THead>
          <tbody>
            {entries.map(([name, fs]) => (
              <TR key={name}>
                <TD className="font-bold">{name}</TD>
                <TD>{fs.type}</TD>
                <TD><RequiredStatus required={fs.required} /></TD>
                <TD>{fmtDefault(fs.default)}</TD>
                <TD>{fmtRange(fs.validation)}</TD>
                <TD className="font-mono text-[12px]">{fmtFormula(fs.operation)}</TD>
              </TR>
            ))}
          </tbody>
        </Table></div>
        <div className="flex flex-col gap-3 md:hidden">
          {entries.map(([name, fs]) => (
            <Panel key={name}>
              <div className="font-semibold text-[var(--color-fg-0)]">{name}</div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                <div><dt className="t-label">Tipo</dt><dd>{fs.type}</dd></div>
                <div><dt className="t-label">Obligatorio</dt><dd className="mt-1"><RequiredStatus required={fs.required} /></dd></div>
                <div><dt className="t-label">Predeterminado</dt><dd>{fmtDefault(fs.default)}</dd></div>
                <div><dt className="t-label">Rango</dt><dd>{fmtRange(fs.validation)}</dd></div>
                {fs.operation && <div className="col-span-2"><dt className="t-label">Fórmula</dt><dd className="break-all font-mono text-[12px]">{fmtFormula(fs.operation)}</dd></div>}
              </dl>
            </Panel>
          ))}
        </div>
        </>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-[13px] font-mono text-[var(--color-fg-3)]">
          Ver JSON
        </summary>
        <pre className="mt-3 whitespace-pre overflow-x-auto rounded-[2px] border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-4 font-mono text-[14px] leading-6 text-[var(--color-fg-2)]">
{JSON.stringify(data.schema, null, 2)}
        </pre>
      </details>
    </div>
  );
}
