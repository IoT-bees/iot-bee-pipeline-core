"use client";
import Link from "next/link";
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
  const verb = action === "edit" ? "edited" : "deleted";
  return (
    <div className="mb-6 border border-[var(--color-danger)] bg-[var(--color-bg-panel)] p-3 rounded-[2px] text-[12px] font-mono text-[var(--color-danger)]">
      <div className="mb-1 font-bold uppercase tracking-[2px]">
        × {resourceLabel} cannot be {verb}
      </div>
      <div className="text-[var(--color-fg-2)]">
        {pipelines.length === 1
          ? `it is used by a running pipeline:`
          : `it is used by ${pipelines.length} running pipelines:`}
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {pipelines.map((p) => (
          <li key={p.id}>
            <Link
              href={`/pipelines/${p.id}`}
              className="text-[var(--color-fg-1)] underline decoration-dotted hover:text-[var(--color-accent)]"
            >
              → {p.name} <span className="text-[var(--color-fg-3)]">(#{p.id}, {p.status.toLowerCase()})</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-3 text-[var(--color-fg-3)]">
        {"// "}stop the pipeline first to {action} this {resourceLabel}.
      </div>
    </div>
  );
}
