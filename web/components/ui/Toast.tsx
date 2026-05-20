"use client";
import { cn } from "@/lib/cn";

export function Toast({
  kind,
  message,
}: {
  kind: "error" | "success" | "info";
  message: string;
}) {
  const color =
    kind === "error"
      ? "border-[var(--color-danger)] text-[var(--color-danger)]"
      : kind === "success"
      ? "border-[var(--color-accent)] text-[var(--color-accent)]"
      : "border-[#333] text-[var(--color-fg-1)]";
  const prefix = kind === "error" ? "×" : kind === "success" ? "✓" : "//";
  return (
    <div
      className={cn(
        "bg-[var(--color-bg-panel)] border px-3 py-2 text-[12px] font-mono rounded-[2px]",
        color,
      )}
    >
      {prefix} {message}
    </div>
  );
}
