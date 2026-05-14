import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  "font-mono text-[12px] tracking-[1px] px-4 py-[9px] rounded-[2px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-bg-base)] font-bold border border-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] hover:border-[var(--color-accent-dim)]",
  ghost:
    "bg-transparent text-[var(--color-fg-1)] border border-[#333] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
  danger:
    "bg-transparent text-[var(--color-danger)] border border-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-bg-base)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "ghost", className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      data-variant={variant}
      className={cn(base, variants[variant], className)}
      {...rest}
    />
  );
});
