import { Panel } from "@/components/ui/Panel";

export function StatusCard({
  title,
  ok,
  children,
}: {
  title: string;
  ok?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Panel tone={ok === false ? "danger" : "accent"}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] tracking-[2px] uppercase text-[var(--color-fg-4)] font-mono">
          {title}
        </span>
        {ok !== undefined && (
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: ok
                ? "var(--color-online)"
                : "var(--color-danger)",
            }}
          />
        )}
      </div>
      <div className="font-mono text-[13px] text-[var(--color-fg-1)] space-y-1">
        {children}
      </div>
    </Panel>
  );
}
