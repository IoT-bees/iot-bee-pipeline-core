"use client";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import type { BlockingPipeline } from "@/lib/hooks/useBlockedEntities";

interface Props {
  pipelines: BlockingPipeline[];
  action?: "edit" | "delete";
  resourceLabel: string;
}

export function PipelineLockBanner({
  pipelines,
  action = "edit",
  resourceLabel,
}: Props) {
  if (pipelines.length === 0) return null;
  const actionLabel = action === "edit" ? "editar" : "eliminar";
  return (
    <div role="alert" className="mb-6 rounded-[3px] border border-[var(--color-danger)] bg-[var(--color-bg-panel)] p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[var(--color-danger)]" aria-hidden="true" />
        <div>
          <div className="t-label font-bold text-[var(--color-danger)]">Edición bloqueada</div>
          <h2 className="mt-1 text-[16px] font-semibold text-[var(--color-fg-0)]">
            No se puede {actionLabel} este recurso
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-[var(--color-fg-2)]">
            {pipelines.length === 1
              ? "Este recurso está en uso por un proyecto activo."
              : `Este recurso está en uso por ${pipelines.length} proyectos activos.`}
          </p>
        </div>
      </div>
      <div className="mt-4 border-t border-[var(--color-border-subtle)] pt-3">
        <div className="mb-2 text-[12px] font-bold uppercase text-[var(--color-fg-3)]">
          {pipelines.length === 1 ? "Proyecto asociado" : "Proyectos asociados"}
        </div>
        <ul className="flex flex-col gap-2">
        {pipelines.map((p) => (
          <li key={p.id}>
            <Link
              href={`/pipelines/${p.id}`}
              className="group flex items-center justify-between gap-3 rounded-[2px] border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 transition-colors hover:border-[var(--color-accent)]"
            >
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-[var(--color-fg-0)]">{p.name}</span>
                <span className="mt-0.5 block text-[12px] text-[var(--color-fg-3)]">Proyecto #{p.id} · Estado: {p.status.toLowerCase()}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[var(--color-accent-strong)] group-hover:text-[var(--color-accent)]">
                Ver proyecto
                <ArrowRight size={15} aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
        </ul>
      </div>
    </div>
  );
}
