import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type Tone = "default" | "accent" | "danger";

const tones: Record<Tone, string> = {
  default: "border-[var(--color-border-subtle)]",
  accent: "border-[var(--color-accent)]",
  danger: "border-[var(--color-danger)]",
};

export function Panel({
  tone = "default",
  className,
  children,
  ...rest
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[var(--color-bg-panel)] border p-4 rounded-[3px]",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
