"use client";
import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import type { ElementType } from "react";
import { cn } from "@/lib/cn";

type ToastKind = "error" | "success" | "info" | "warning";

const toastStyles: Record<
  ToastKind,
  { label: string; container: string; icon: ElementType }
> = {
  error: {
    label: "Error",
    container:
      "border-[var(--color-danger)] bg-[color-mix(in_srgb,var(--color-danger)_8%,var(--color-bg-panel))]",
    icon: CircleAlert,
  },
  success: {
    label: "Completado",
    container:
      "border-[var(--color-online)] bg-[color-mix(in_srgb,var(--color-online)_8%,var(--color-bg-panel))]",
    icon: CheckCircle2,
  },
  info: {
    label: "Información",
    container:
      "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-bg-panel))]",
    icon: Info,
  },
  warning: {
    label: "Atención",
    container:
      "border-amber-400/60 bg-[color-mix(in_srgb,#f59e0b_8%,var(--color-bg-panel))]",
    icon: TriangleAlert,
  },
};

export function Toast({
  kind,
  message,
  onDismiss,
}: {
  kind: ToastKind;
  message: string;
  onDismiss: () => void;
}) {
  const { label, container, icon: Icon } = toastStyles[kind];
  const iconColor =
    kind === "error"
      ? "text-[var(--color-danger)]"
      : kind === "success"
        ? "text-[var(--color-online)]"
        : kind === "warning"
          ? "text-amber-500"
        : "text-[var(--color-accent-strong)]";

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live={kind === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      className={cn(
        "flex w-full items-start gap-3 rounded-[3px] border px-3 py-3 font-mono shadow-lg",
        container,
      )}
    >
      <Icon className={cn("mt-0.5 shrink-0", iconColor)} size={18} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className={cn("text-[11px] font-bold uppercase leading-none", iconColor)}>{label}</p>
        <p className="mt-1 text-[12px] leading-5 text-[var(--color-fg-1)]">{message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={`Cerrar notificación: ${label}`}
        className="-mr-1 -mt-1 shrink-0 rounded-[2px] p-1 text-[var(--color-fg-3)] transition-colors hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-fg-0)]"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
