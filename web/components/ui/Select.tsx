import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "block w-full bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-3 py-[10px] text-[14px] font-mono rounded-[2px] outline-none focus:border-[var(--color-accent)]",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});
