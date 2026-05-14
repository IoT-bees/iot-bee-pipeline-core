import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "block w-full bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-3 py-[9px] text-[12px] font-mono rounded-[2px] outline-none focus:border-[var(--color-accent)]",
          className,
        )}
        {...rest}
      />
    );
  },
);
