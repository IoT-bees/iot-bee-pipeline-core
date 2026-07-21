"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, Plus, Workflow } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { DeleteResourceDialog } from "@/components/ui/DeleteResourceDialog";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { SearchInput, SelectFilter } from "@/components/ui/ListFilters";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { PipelineActions } from "@/components/pipelines/PipelineActions";
import { useDeletePipeline } from "@/lib/hooks/usePipelines";
import { usePipelineStatusAll } from "@/lib/hooks/usePipelineStatusAll";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import { pipelinesApi } from "@/lib/api/endpoints/pipelines";
import { fmtId } from "@/lib/fmt";
import { isActiveReplica, pipelineStatusLabel, toPillState } from "@/lib/status";
import type { Pipeline, PipelineStatus } from "@/lib/api/types";

const PIPELINE_STATE_OPTIONS = [
  { value: "HEALTHY", label: "operativo" },
  { value: "DEGRADED", label: "con incidencias" },
  { value: "IDLE", label: "en espera" },
  { value: "STOPPED", label: "detenido" },
] as const;
type PipelineStateFilter = (typeof PIPELINE_STATE_OPTIONS)[number]["value"];

function countActiveReplicas(status?: PipelineStatus): number | undefined {
  if (!status) return undefined;
  const replicas =
    status?.replicas ??
    Object.entries(status?.replica_statuses ?? {}).map(([replicaId, replicaStatus]) => ({
      replica_id: Number(replicaId),
      status: String(replicaStatus),
      last_processed_at: null,
      last_error: null,
    }));

  return replicas.filter((replica) => isActiveReplica(replica.status)).length;
}

function PipelineStatusPill({
  status,
  isPending,
  isError,
}: {
  status?: string;
  isPending: boolean;
  isError: boolean;
}) {
  if (isError) return <Pill state="error">NO DISPONIBLE</Pill>;
  if (isPending) return <Pill state="starting">ACTUALIZANDO</Pill>;
  if (!status) return <Pill state="starting">SIN ESTADO</Pill>;
  return <Pill state={toPillState(status)}>{pipelineStatusLabel(status)}</Pill>;
}

export function PipelinesClient({ initialData }: { initialData?: Pipeline[] }) {
  const pipesQ = useQuery({
    queryKey: ["pipelines", "list"],
    queryFn: pipelinesApi.list,
    initialData,
    initialDataUpdatedAt: 0,
    refetchOnMount: "always",
    staleTime: 15_000,
  });
  const {
    data: status,
    isPending: statusPending,
    isError: statusError,
  } = usePipelineStatusAll();
  const del = useDeletePipeline();
  const confirmDelete = useConfirmDelete(del.mutateAsync);
  const statusMap = useMemo(
    () =>
      new Map((status ?? []).map((s) => [s.pipeline_id, s])),
    [status],
  );
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<PipelineStateFilter | "ALL">("ALL");
  const [groupFilter, setGroupFilter] = useState<string | "ALL">("ALL");
  const all = useMemo(() => pipesQ.data ?? [], [pipesQ.data]);
  const groupOptions = useMemo(
    () => Array.from(new Map(all.map((pipeline) => [pipeline.pipelineGroup.id, pipeline.pipelineGroup.name])))
      .sort(([, left], [, right]) => left.localeCompare(right))
      .map(([id, name]) => ({ value: String(id), label: name })),
    [all],
  );
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((p) => {
      const st = statusMap.get(p.id)?.pipeline_general_status?.toUpperCase();
      if (stateFilter !== "ALL" && st !== stateFilter) return false;
      if (
        groupFilter !== "ALL" &&
        String(p.pipelineGroup.id) !== groupFilter
      ) return false;
      if (!q) return true;
      return [p.name, p.dataSource?.name, p.dataStore?.name]
        .some((f) => (f ?? "").toLowerCase().includes(q));
    });
  }, [all, statusMap, query, stateFilter, groupFilter]);

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-[var(--color-border-subtle)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="t-label mb-2 text-[var(--color-accent-strong)]">Operación de proyectos</p>
          <h1 className="t-title mb-2">Proyectos</h1>
          <p className="t-body max-w-[650px]">
            Configura, supervisa y opera tus proyectos de datos.
          </p>
        </div>
        {all.length > 0 && (
          <Link href="/pipelines/new">
            <Button variant="primary" className="min-h-10">
              <Plus size={16} aria-hidden="true" className="mr-1.5" />
              Crear proyecto
            </Button>
          </Link>
        )}
      </div>
      {all.length > 0 && (
        <div className="mt-8 mb-5 flex gap-3 items-center flex-wrap">
          <div className="ml-auto flex items-center gap-3 flex-wrap">
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar proyecto" />
            <SelectFilter
              label="estado"
              value={stateFilter}
              options={PIPELINE_STATE_OPTIONS}
              onChange={setStateFilter}
            />
            <SelectFilter
              label="grupo"
              value={groupFilter}
              options={groupOptions}
              onChange={setGroupFilter}
            />
          </div>
        </div>
      )}
      {pipesQ.isError && !pipesQ.data ? (
        <Panel tone="danger">
          <div className="flex flex-wrap items-center justify-between gap-3" role="alert">
            <div>
              <h2 className="font-semibold text-[var(--color-fg-0)]">No pudimos cargar los proyectos</h2>
              <p className="mt-1 text-[14px] text-[var(--color-fg-2)]">Reintenta para consultar la lista actualizada.</p>
            </div>
            <Button type="button" variant="ghost" onClick={() => void pipesQ.refetch()}>Reintentar</Button>
          </div>
        </Panel>
      ) : pipesQ.isPending ? (
        <HoneycombLoader label="Cargando proyectos" />
      ) : (
        <>
          {pipesQ.isError && (
            <Panel tone="danger" className="mb-4">
              <div role="alert">Mostramos la última información disponible. No pudimos actualizar la lista de proyectos.</div>
            </Panel>
          )}
          {(statusError || (!statusPending && status?.length === 0)) && all.length > 0 && (
            <Panel
              className="mb-4"
              style={{
                borderColor: "#38bdf8",
                backgroundColor:
                  "color-mix(in srgb, #38bdf8 10%, var(--color-bg-panel))",
              }}
            >
              <div role="status" aria-live="polite" className="flex items-start gap-3">
                <Info
                  size={20}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-sky-400"
                />
                <div>
                  <p className="text-[14px] font-semibold text-sky-400 mb-1">
                    Información de estado
                  </p>
                  <p className="text-[13px] text-[var(--color-fg-2)]">
                    El estado operativo no está disponible. Los proyectos se
                    muestran, pero no podemos confirmar si están en ejecución.
                  </p>
                </div>
              </div>
            </Panel>
          )}
      {all.length === 0 ? (
        <div className="mt-8">
          <Panel className="mx-auto flex min-h-[260px] max-w-2xl flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 grid size-12 place-items-center rounded-full border border-[var(--color-accent)] bg-[var(--color-bg-elev)] text-[var(--color-accent-strong)]">
              <Workflow size={22} aria-hidden="true" />
            </div>
            <h2 className="text-[18px] font-semibold text-[var(--color-fg-0)]">
              Crea tu primer proyecto
            </h2>
            <p className="mt-2 max-w-md text-[14px] leading-6 text-[var(--color-fg-2)]">
              El editor te guía para elegir o crear una conexión, unas reglas de datos y un destino en un solo flujo.
            </p>
            <Link href="/pipelines/new" className="mt-5">
              <Button variant="primary" className="min-h-11 gap-2">
                <Plus size={16} aria-hidden="true" />
                Crear mi primer proyecto
              </Button>
            </Link>
          </Panel>
        </div>
      ) : list.length === 0 ? (
        <div className="t-mono">
          No hay proyectos que coincidan{query && ` con "${query}"`}
          {stateFilter !== "ALL" && ` · estado=${stateFilter.toLowerCase()}`}
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <THead>
                <TH>#</TH>
                <TH>PROYECTO</TH>
                <TH>BROKER</TH>
                <TH>DESTINO</TH>
                <TH>RÉPLICAS</TH>
                <TH>ESTADO</TH>
                <TH className="text-right">ACCIONES</TH>
              </THead>
              <tbody>
                {list.map((p) => {
                  const pipelineStatus = statusMap.get(p.id);
                  const st = pipelineStatus?.pipeline_general_status;
                  const activeReplicaCount = countActiveReplicas(pipelineStatus);
                  return (
                    <TR key={p.id}>
                      <TD>{fmtId(p.id)}</TD>
                      <TD>
                        <Link
                          href={`/pipelines/${p.id}`}
                          className="font-semibold text-[var(--color-fg-0)] hover:text-[var(--color-accent-strong)] hover:underline underline-offset-4"
                        >
                          {p.name}
                        </Link>
                      </TD>
                      <TD>
                        {p.dataSource ? (
                          <Link href={`/sources/${p.dataSource.id}`} className="hover:text-[var(--color-accent)] hover:underline underline-offset-4">
                            {p.dataSource.name}
                          </Link>
                        ) : "—"}
                      </TD>
                      <TD>
                        {p.dataStore ? (
                          <Link href={`/stores/${p.dataStore.id}`} className="hover:text-[var(--color-accent)] hover:underline underline-offset-4">
                            {p.dataStore.name}
                          </Link>
                        ) : "—"}
                      </TD>
                      <TD>
                        {activeReplicaCount ?? "—"} / {p.replicationFactor}
                      </TD>
                      <TD><PipelineStatusPill status={st} isPending={statusPending} isError={statusError} /></TD>
                      <TD className="text-right">
                        <div className="flex gap-1.5 justify-end">
                          <Link href={`/pipelines/${p.id}`}>
                            <Button variant="ghost" size="sm">Ver</Button>
                          </Link>
                          <PipelineActions
                            id={p.id}
                            name={p.name}
                            status={st}
                            hideUnknownAction
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
              const pipelineStatus = statusMap.get(p.id);
              const st = pipelineStatus?.pipeline_general_status;
              const activeReplicaCount = countActiveReplicas(pipelineStatus);
              return (
                <Panel key={p.id}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="t-label">
                        #{fmtId(p.id)}
                      </div>
                      <Link
                        href={`/pipelines/${p.id}`}
                        className="font-bold hover:text-[var(--color-accent)]"
                      >
                        {p.name}
                      </Link>
                      <div className="t-mono">
                        {p.dataSource ? (
                          <Link href={`/sources/${p.dataSource.id}`} className="hover:text-[var(--color-accent)] hover:underline underline-offset-4">
                            {p.dataSource.name}
                          </Link>
                        ) : "—"} → {p.dataStore ? (
                          <Link href={`/stores/${p.dataStore.id}`} className="hover:text-[var(--color-accent)] hover:underline underline-offset-4">
                            {p.dataStore.name}
                          </Link>
                        ) : "—"} ·{" "}
                        {activeReplicaCount === undefined
                          ? "estado de réplicas no disponible"
                          : `${activeReplicaCount} activa${activeReplicaCount === 1 ? "" : "s"} / ${p.replicationFactor}`}
                      </div>
                    </div>
                    <PipelineStatusPill status={st} isPending={statusPending} isError={statusError} />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Link href={`/pipelines/${p.id}`}>
                      <Button variant="ghost" size="sm">Ver</Button>
                    </Link>
                    <PipelineActions
                      id={p.id}
                      name={p.name}
                      status={st}
                      hideUnknownAction
                      onDelete={confirmDelete.ask}
                    />
                  </div>
                </Panel>
              );
            })}
          </div>
        </>
      )}
        </>
      )}

      <DeleteResourceDialog
        pending={confirmDelete.pending}
        resourceLabel="proyecto"
        impact="Los proyectos activos se detienen primero. Esta acción no se puede deshacer."
        busy={del.isPending}
        error={confirmDelete.error}
        onConfirm={confirmDelete.confirm}
        onClose={confirmDelete.cancel}
      />
    </div>
  );
}
