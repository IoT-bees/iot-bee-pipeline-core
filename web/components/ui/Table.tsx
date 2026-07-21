import { cn } from "@/lib/cn";

export function Table({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-[3px] border border-[var(--color-border-strong)] bg-[var(--color-bg-nav)] shadow-[0_1px_2px_rgb(38_42_51_/_8%)]">
      <table
        className={cn(
          "w-full min-w-[680px] border-collapse bg-[var(--color-bg-nav)] text-[14px] font-mono",
          className,
        )}
      >
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-[var(--color-bg-nav)]">
      <tr className="text-left text-[var(--color-accent)]">{children}</tr>
    </thead>
  );
}

export function TH({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-[var(--color-border-strong)] bg-[var(--color-bg-nav)] px-4 py-3 font-semibold text-[12px]",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TR({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <tr
      className={cn(
        "bg-[var(--color-bg-nav)] transition-colors hover:bg-[var(--color-bg-elev)]",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td
      className={cn(
        "border-b border-[var(--color-border-subtle)] px-4 py-3.5 text-[var(--color-fg-2)]",
        className,
      )}
    >
      {children}
    </td>
  );
}
