import { cn } from "@/lib/cn";

export function FormField({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-fg-3)] mb-1.5">
        {"// "}{label}
      </div>
      {children}
      {hint && !error && (
        <div className="text-[12px] text-[var(--color-fg-4)] mt-1.5">{hint}</div>
      )}
      {error && (
        <div className="text-[12px] text-[var(--color-danger)] mt-1.5">× {error}</div>
      )}
    </div>
  );
}
