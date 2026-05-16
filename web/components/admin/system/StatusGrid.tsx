import { StatusCard } from "./StatusCard";
import type { SystemStatus } from "@/lib/api/types";

function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function StatusGrid({ status }: { status: SystemStatus }) {
  const allDepsOk = status.dependencies.every((d) => d.ok);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <StatusCard title="dependencies" ok={allDepsOk}>
        {status.dependencies.map((d) => (
          <div key={d.name} className="flex items-center justify-between">
            <span>{d.name}</span>
            <span className="text-[12px]">
              {d.ok ? (
                <span style={{ color: "var(--color-online)" }}>
                  ok {d.latencyMs != null && `· ${d.latencyMs}ms`}
                </span>
              ) : (
                <span
                  style={{ color: "var(--color-danger)" }}
                  className="text-[11px]"
                >
                  {d.error ?? "down"}
                </span>
              )}
            </span>
          </div>
        ))}
      </StatusCard>

      <StatusCard title="runtime">
        <div className="flex items-center justify-between">
          <span>configured pipelines</span>
          <span>{status.runtime.configuredPipelines}</span>
        </div>
        {status.runtime.liveReplicas != null && (
          <div className="flex items-center justify-between">
            <span>live replicas</span>
            <span>{status.runtime.liveReplicas}</span>
          </div>
        )}
        {status.runtime.msgsLastHour != null && (
          <div className="flex items-center justify-between">
            <span>messages · last hour</span>
            <span>{status.runtime.msgsLastHour}</span>
          </div>
        )}
      </StatusCard>

      <StatusCard title="build">
        <div className="flex items-center justify-between">
          <span>commit</span>
          <span className="text-[12px]">
            {status.build.commit.substring(0, 12)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>built</span>
          <span className="text-[12px]">{status.build.buildTime}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>uptime</span>
          <span>{formatUptime(status.build.uptimeSeconds)}</span>
        </div>
      </StatusCard>

      <StatusCard title="probed">
        <div className="text-[12px] text-[var(--color-fg-3)]">
          {new Date(status.probedAt).toLocaleString()}
        </div>
        <div className="text-[11px] text-[var(--color-fg-4)] mt-2">
          {"// "}refreshes every 10 seconds
        </div>
      </StatusCard>
    </div>
  );
}
