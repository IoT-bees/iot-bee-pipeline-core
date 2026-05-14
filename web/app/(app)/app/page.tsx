"use client";

import { Panel } from "@/components/ui/Panel";
import { Pill, type PillState } from "@/components/ui/Pill";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { usePipelineStatusAll } from "@/lib/hooks/usePipelineStatusAll";
import { useStartPipeline } from "@/lib/hooks/useStartPipeline";
import { useStopPipeline } from "@/lib/hooks/useStopPipeline";

function toPill(s?: string): PillState {
  if (s === "Running") return "running";
  if (s === "Error") return "error";
  return "idle";
}

export default function Overview() {
  const { data, isLoading } = usePipelineStatusAll();
  const start = useStartPipeline();
  const stop = useStopPipeline();

  const list = data ?? [];
  const running = list.filter((p) => p.status === "Running").length;
  const errored = list.filter((p) => p.status === "Error").length;
  const total = list.length;

  return (
    <div>
      <h1 className="t-title mb-4">overview</h1>
      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <Panel tone="accent">
          <div className="t-label">{"// "}ACTIVE</div>
          <div className="t-title mt-1">
            {running} / {total}
          </div>
        </Panel>
        <Panel tone={errored ? "danger" : "default"}>
          <div className="t-label">{"// "}ERRORS</div>
          <div className="t-title mt-1">{errored}</div>
        </Panel>
        <Panel>
          <div className="t-label">{"// "}TOTAL PIPELINES</div>
          <div className="t-title mt-1">{total}</div>
        </Panel>
      </div>

      <h2 className="t-section mb-3">{"// "}pipelines</h2>
      {isLoading ? (
        <div className="t-mono">{"// "}loading…</div>
      ) : list.length === 0 ? (
        <div className="t-mono">
          {"// "}no pipelines yet — start by creating a data source
        </div>
      ) : (
        <>
          {/* desktop */}
          <div className="hidden md:block">
            <Table>
              <THead>
                <TH>#</TH>
                <TH>NAME</TH>
                <TH>STATE</TH>
                <TH className="text-right">ACTIONS</TH>
              </THead>
              <tbody>
                {list.map((p) => (
                  <TR key={p.pipeline_id}>
                    <TD>{String(p.pipeline_id).padStart(2, "0")}</TD>
                    <TD>{p.pipeline_name}</TD>
                    <TD>
                      <Pill state={toPill(p.status)}>{p.status.toUpperCase()}</Pill>
                    </TD>
                    <TD className="text-right">
                      <div className="flex gap-1.5 justify-end">
                        {p.status === "Running" ? (
                          <button
                            onClick={() => stop.mutate(p.pipeline_id)}
                            className="text-[10px] border border-[var(--color-danger)] text-[var(--color-danger)] px-2 py-1 rounded-[2px]"
                          >
                            ■ stop
                          </button>
                        ) : (
                          <button
                            onClick={() => start.mutate(p.pipeline_id)}
                            className="text-[10px] border border-[var(--color-accent)] text-[var(--color-accent)] px-2 py-1 rounded-[2px]"
                          >
                            ▸ start
                          </button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </div>

          {/* mobile */}
          <div className="md:hidden flex flex-col gap-2">
            {list.map((p) => (
              <Panel key={p.pipeline_id}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="t-label">{"// "}#{String(p.pipeline_id).padStart(2, "0")}</div>
                    <div className="font-bold">{p.pipeline_name}</div>
                  </div>
                  <Pill state={toPill(p.status)}>{p.status.toUpperCase()}</Pill>
                </div>
                <div className="flex gap-2">
                  {p.status === "Running" ? (
                    <button
                      onClick={() => stop.mutate(p.pipeline_id)}
                      className="text-[10px] border border-[var(--color-danger)] text-[var(--color-danger)] px-2 py-1 rounded-[2px]"
                    >
                      ■ stop
                    </button>
                  ) : (
                    <button
                      onClick={() => start.mutate(p.pipeline_id)}
                      className="text-[10px] border border-[var(--color-accent)] text-[var(--color-accent)] px-2 py-1 rounded-[2px]"
                    >
                      ▸ start
                    </button>
                  )}
                </div>
              </Panel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
