type Variant = "row" | "card" | "panel";

export function RowSkeleton({
  variant = "row",
  count = 3,
}: {
  variant?: Variant;
  count?: number;
}) {
  const items = Array.from({ length: count });
  if (variant === "panel") {
    return (
      <div className="border border-[var(--color-border)] p-5 animate-pulse space-y-4">
        <div className="h-3 w-1/3 bg-[var(--color-fg-5)]/40" />
        <div className="h-3 w-2/3 bg-[var(--color-fg-5)]/30" />
        <div className="h-3 w-1/2 bg-[var(--color-fg-5)]/20" />
      </div>
    );
  }
  if (variant === "card") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((_, i) => (
          <div
            key={i}
            className="border border-[var(--color-border)] p-4 animate-pulse space-y-3"
          >
            <div className="h-3 w-2/3 bg-[var(--color-fg-5)]/40" />
            <div className="h-3 w-1/3 bg-[var(--color-fg-5)]/30" />
          </div>
        ))}
      </div>
    );
  }
  // row
  return (
    <div className="border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
      {items.map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-4 gap-4 px-4 py-3 animate-pulse"
        >
          <div className="h-3 bg-[var(--color-fg-5)]/40" />
          <div className="h-3 bg-[var(--color-fg-5)]/30" />
          <div className="h-3 bg-[var(--color-fg-5)]/30" />
          <div className="h-3 bg-[var(--color-fg-5)]/20" />
        </div>
      ))}
    </div>
  );
}
