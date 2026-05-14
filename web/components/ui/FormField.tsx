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
    <div className={cn("mb-3.5", className)}>
      <div className="t-label mb-1">{"// "}{label}</div>
      {children}
      {hint && !error && (
        <div className="text-[10px] text-[var(--color-fg-4)] mt-1">{hint}</div>
      )}
      {error && (
        <div className="text-[10px] text-[var(--color-danger)] mt-1">× {error}</div>
      )}
    </div>
  );
}
