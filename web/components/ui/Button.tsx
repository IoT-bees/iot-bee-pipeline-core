import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  "font-mono tracking-[1px] rounded-[2px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center";

const sizes: Record<Size, string> = {
  sm: "text-[12px] px-3 py-[6px]",
  md: "text-[13px] px-5 py-[10px]",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-bg-base)] font-bold border border-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] hover:border-[var(--color-accent-dim)]",
  ghost:
    "bg-transparent text-[var(--color-fg-1)] border border-[#333] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
  danger:
    "bg-transparent text-[var(--color-danger)] border border-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-bg-base)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "ghost", size = "md", className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      data-variant={variant}
      data-size={size}
      className={cn(base, sizes[size], variants[variant], className)}
      {...rest}
    />
  );
});
