import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function AdminPageHeader({
  title,
  description,
  action,
  meta,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-[var(--color-border-subtle)] pb-5 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[24px] font-bold leading-tight text-[var(--color-fg-0)] sm:text-[26px]">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-6 text-[var(--color-fg-2)]">
          {description}
        </p>
        {meta && <div className="mt-3 text-[13px] text-[var(--color-fg-3)]">{meta}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
