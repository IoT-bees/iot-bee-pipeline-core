import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "block w-full bg-[var(--color-bg-panel)] border border-[var(--color-border)] text-[var(--color-fg-1)] px-3 py-[10px] text-[14px] font-mono rounded-[2px] outline-none focus:border-[var(--color-accent)] focus-visible:outline-none placeholder:text-[var(--color-fg-4)]",
          className,
        )}
        {...rest}
      />
    );
  },
);
