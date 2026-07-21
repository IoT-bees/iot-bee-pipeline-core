import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        className={cn(
          "block w-full appearance-none rounded-[2px] border border-[var(--color-border)] bg-[var(--color-bg-panel)] px-3 py-[10px] pr-10 font-mono text-[14px] text-[var(--color-fg-1)] outline-none transition-colors focus:border-[var(--color-accent)] disabled:cursor-not-allowed",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        size={18}
        strokeWidth={2}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-fg-3)]"
      />
    </div>
  );
});
