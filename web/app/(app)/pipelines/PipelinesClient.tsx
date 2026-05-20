"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { DeleteResourceDialog } from "@/components/ui/DeleteResourceDialog";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { PipelineActions } from "@/components/pipelines/PipelineActions";
import { useDeletePipeline } from "@/lib/hooks/usePipelines";
import { usePipelineStatusAll } from "@/lib/hooks/usePipelineStatusAll";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import { pipelinesApi } from "@/lib/api/endpoints/pipelines";
import { fmtId } from "@/lib/fmt";
import { toPillState } from "@/lib/status";
import type { Pipeline } from "@/lib/api/types";

export function PipelinesClient({ initialData }: { initialData?: Pipeline[] }) {
  const { data: pipes } = useQuery({
    queryKey: ["pipelines", "list"],
    queryFn: pipelinesApi.list,
    initialData,
    staleTime: 15_000,
  });
  const { data: status } = usePipelineStatusAll();
  const del = useDeletePipeline();
  const confirmDelete = useConfirmDelete(del.mutateAsync);
  const stMap = useMemo(
    () =>
      new Map(
        (status ?? []).map((s) => [s.pipeline_id, s.pipeline_general_status]),
      ),
    [status],
  );
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
                <TH>SOURCE</TH>
                <TH>STORE</TH>
                <TH>REPL.</TH>
                <TH>STATE</TH>
                <TH className="text-right">ACTIONS</TH>
              </THead>
              <tbody>
                {list.map((p) => {
                  const st = stMap.get(p.id);
                  return (
                    <TR key={p.id}>
                      <TD>{fmtId(p.id)}</TD>
                      <TD>
                        <Link
                          href={`/pipelines/${p.id}`}
                          className="hover:text-[var(--color-accent)]"
                        >
                          {p.name}
                        </Link>
                      </TD>
                      <TD>{p.dataSource?.name ?? "—"}</TD>
                      <TD>{p.dataStore?.name ?? "—"}</TD>
                      <TD>{p.replicationFactor}</TD>
                      <TD>
                        <Pill state={toPillState(st)}>
                          {(st ?? "STOPPED").toUpperCase()}
                        </Pill>
                      </TD>
                      <TD className="text-right">
                        <div className="flex gap-1.5 justify-end">
                          <Link href={`/pipelines/${p.id}`}>
                            <Button variant="ghost" size="sm">view</Button>
                          </Link>
                          <PipelineActions
                            id={p.id}
                            name={p.name}
                            status={st}
                            onDelete={confirmDelete.ask}
                          />
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
              return (
                <Panel key={p.id}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="t-label">
                        {"// "}#{fmtId(p.id)}
                      </div>
                      <Link
                        href={`/pipelines/${p.id}`}
                        className="font-bold hover:text-[var(--color-accent)]"
                      >
                        {p.name}
                      </Link>
                      <div className="t-mono">
                        {p.dataSource?.name} → {p.dataStore?.name} ·{" "}
                        {p.replicationFactor} replicas
                      </div>
                    </div>
                    <Pill state={toPillState(st)}>
                      {(st ?? "STOPPED").toUpperCase()}
                    </Pill>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Link href={`/pipelines/${p.id}`}>
                      <Button variant="ghost" size="sm">view</Button>
                    </Link>
                    <PipelineActions
                      id={p.id}
                      name={p.name}
                      status={st}
                      onDelete={confirmDelete.ask}
                    />
                  </div>
                </Panel>
              );
            })}
          </div>
        </>
      )}

      <DeleteResourceDialog
        pending={confirmDelete.pending}
        resourceLabel="pipeline"
        impact="Pipelines that are currently running are stopped first. This action cannot be undone."
        busy={del.isPending}
        error={confirmDelete.error}
        onConfirm={confirmDelete.confirm}
        onClose={confirmDelete.cancel}
      />
    </div>
  );
}
