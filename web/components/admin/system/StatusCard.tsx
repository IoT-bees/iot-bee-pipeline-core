import { cn } from "@/lib/cn";

type StatusTone = "success" | "warning" | "danger" | "neutral";

const tones: Record<StatusTone, string> = {
  success: "border-[var(--color-online)]/35",
  warning: "border-amber-400/45",
  danger: "border-[var(--color-danger)]/45",
  neutral: "border-[var(--color-border-subtle)]",
};

export function StatusCard({
  title,
  tone = "neutral",
  className,
  children,
}: {
  title: string;
  tone?: StatusTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-md border bg-[var(--color-bg-panel)] p-5",
        tones[tone],
        className,
      )}
    >
      <h3 className="mb-4 text-sm font-semibold text-[var(--color-fg-1)]">
        {title}
      </h3>
      {children}
    </section>
  );
}
