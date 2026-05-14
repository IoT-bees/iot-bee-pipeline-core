"use client";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Pill, type PillState } from "@/components/ui/Pill";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { useDeletePipeline, usePipelines } from "@/lib/hooks/usePipelines";
import { usePipelineStatusAll } from "@/lib/hooks/usePipelineStatusAll";
import { useStartPipeline } from "@/lib/hooks/useStartPipeline";
import { useStopPipeline } from "@/lib/hooks/useStopPipeline";

function toPill(s?: string): PillState {
  if (s === "Running") return "running";
  if (s === "Error") return "error";
  return "idle";
}

export default function PipelinesPage() {
  const { data: pipes } = usePipelines();
  const { data: status } = usePipelineStatusAll();
  const start = useStartPipeline();
  const stop = useStopPipeline();
  const del = useDeletePipeline();
  const stMap = new Map((status ?? []).map((s) => [s.pipeline_id, s.status]));
  const list = pipes ?? [];

  return (
    <div>
      <h1 className="t-title mb-1">pipelines</h1>
      <p className="t-mono mb-4">
        {"// "}connect a source, a schema, a store. then start.
      </p>
      <div className="flex gap-3 items-center mb-4">
        <Link href="/pipelines/new">
          <Button variant="primary">+ NEW PIPELINE</Button>
        </Link>
      </div>
      {list.length === 0 ? (
        <div className="t-mono">{"// "}no pipelines yet</div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <THead>
                <TH>#</TH>
                <TH>NAME</TH>
                <TH>REPL.</TH>
                <TH>STATE</TH>
                <TH className="text-right">ACTIONS</TH>
              </THead>
              <tbody>
                {list.map((p) => {
                  const st = stMap.get(p.id);
                  const running = st === "Running";
                  return (
                    <TR key={p.id}>
                      <TD>{String(p.id).padStart(2, "0")}</TD>
                      <TD>
                        <Link
                          href={`/pipelines/${p.id}`}
                          className="hover:text-[var(--color-accent)]"
                        >
                          {p.name}
                        </Link>
                      </TD>
                      <TD>{p.replication}</TD>
                      <TD>
                        <Pill state={toPill(st)}>
                          {(st ?? "STOPPED").toUpperCase()}
                        </Pill>
                      </TD>
                      <TD className="text-right">
                        <div className="flex gap-1.5 justify-end">
                          {running ? (
                            <button
                              onClick={() => stop.mutate(p.id)}
                              className="text-[10px] border border-[var(--color-danger)] text-[var(--color-danger)] px-2 py-1 rounded-[2px]"
                            >
                              ■ stop
                            </button>
                          ) : (
                            <button
                              onClick={() => start.mutate(p.id)}
                              className="text-[10px] border border-[var(--color-accent)] text-[var(--color-accent)] px-2 py-1 rounded-[2px]"
                            >
                              ▸ start
                            </button>
                          )}
                          <button
                            onClick={() => confirm(`delete ${p.name}?`) && del.mutate(p.id)}
                            className="text-[10px] border border-[#333] text-[var(--color-fg-3)] px-2 py-1 rounded-[2px]"
                          >
                            delete
                          </button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          </div>
          <div className="md:hidden flex flex-col gap-2">
            {list.map((p) => {
              const st = stMap.get(p.id);
              const running = st === "Running";
              return (
                <Panel key={p.id}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="t-label">{"// "}#{String(p.id).padStart(2, "0")}</div>
                      <Link
                        href={`/pipelines/${p.id}`}
                        className="font-bold hover:text-[var(--color-accent)]"
                      >
                        {p.name}
                      </Link>
                      <div className="t-mono">{p.replication} replicas</div>
                    </div>
                    <Pill state={toPill(st)}>
                      {(st ?? "STOPPED").toUpperCase()}
                    </Pill>
                  </div>
                  <div className="flex gap-2">
                    {running ? (
                      <button
                        onClick={() => stop.mutate(p.id)}
                        className="text-[10px] border border-[var(--color-danger)] text-[var(--color-danger)] px-2 py-1 rounded-[2px]"
                      >
                        ■ stop
                      </button>
                    ) : (
                      <button
                        onClick={() => start.mutate(p.id)}
                        className="text-[10px] border border-[var(--color-accent)] text-[var(--color-accent)] px-2 py-1 rounded-[2px]"
                      >
                        ▸ start
                      </button>
                    )}
                    <button
                      onClick={() => confirm(`delete ${p.name}?`) && del.mutate(p.id)}
                      className="text-[10px] border border-[#333] text-[var(--color-fg-3)] px-2 py-1 rounded-[2px]"
                    >
                      delete
                    </button>
                  </div>
                </Panel>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
