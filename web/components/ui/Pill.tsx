import { cn } from "@/lib/cn";

export type PillState = "running" | "error" | "idle" | "starting";

const colors: Record<PillState, string> = {
  running: "text-[var(--color-online)] border-[var(--color-online)]",
  error: "text-[var(--color-danger)] border-[var(--color-danger)]",
  idle: "text-[var(--color-fg-3)] border-[var(--color-border-strong)]",
  starting: "text-[var(--color-warn)] border-[var(--color-warn)]",
};

export function Pill({
  state,
  children,
}: {
  state: PillState;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-[3px] border rounded-[2px]",
        colors[state],
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
