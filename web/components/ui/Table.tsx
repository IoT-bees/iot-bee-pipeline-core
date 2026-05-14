import { cn } from "@/lib/cn";

export function Table({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <table className={cn("w-full text-[11px] font-mono", className)}>{children}</table>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="text-[var(--color-accent)] text-left">{children}</tr>
    </thead>
  );
}

export function TH({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-[var(--color-accent)] px-2 py-2 font-normal tracking-[1.5px]",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TR({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <tr className={cn("hover:bg-[var(--color-bg-elev)]", className)}>{children}</tr>
  );
}

export function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td
      className={cn(
        "border-b border-dashed border-[#1f1f1f] px-2 py-2 text-[var(--color-fg-2)]",
        className,
      )}
    >
      {children}
    </td>
  );
}
