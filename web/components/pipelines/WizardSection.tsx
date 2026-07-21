"use client";
import { useState, type ReactNode } from "react";

export function WizardSection({
  step,
  title,
  status,
  defaultOpen = false,
  children,
}: {
  step: number;
  title: string;
  status: "pending" | "ready" | "error";
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const statusGlyph =
    status === "ready" ? "✓" : status === "error" ? "✗" : "·";
  const statusColor =
    status === "ready"
      ? "text-[var(--color-online)]"
      : status === "error"
      ? "text-[var(--color-danger)]"
      : "text-[var(--color-fg-4)]";
  return (
    <div className="border border-[var(--color-border-subtle)] mb-3 bg-[var(--color-bg-panel)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[var(--color-bg-elev)]"
      >
        <span className={`font-mono ${statusColor}`}>{statusGlyph}</span>
        <span className="text-[12px] text-[var(--color-fg-3)]">
          PASO {step}
        </span>
        <span className="text-[14px] text-[var(--color-fg-0)] flex-1">
          {title}
        </span>
        <span className="text-[var(--color-fg-4)]">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-4 py-4 border-t border-[var(--color-border-subtle)]">{children}</div>
      )}
    </div>
  );
}
