"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Info, Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { DeleteResourceDialog } from "@/components/ui/DeleteResourceDialog";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { SearchInput } from "@/components/ui/ListFilters";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { Select } from "@/components/ui/Select";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { groupsApi } from "@/lib/api/endpoints/groups";
import { fmtId } from "@/lib/fmt";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import { useDeleteGroup, useMovePipelineToGroup } from "@/lib/hooks/useGroups";
import { usePipelines } from "@/lib/hooks/usePipelines";
import { usePipelineStatusAll } from "@/lib/hooks/usePipelineStatusAll";
import { pipelineStatusLabel, toPillState } from "@/lib/status";
import type { Pipeline, PipelineGroup, PipelineStatus } from "@/lib/api/types";

type GroupRow = {
  group: PipelineGroup;
  pipelines: Pipeline[];
  healthy: number;
  degraded: number;
  stopped: number;
  unknown: number;
};

function pipelineState(status?: PipelineStatus) {
  return status?.pipeline_general_status?.toUpperCase();
}

export function GroupsClient({ initialData }: { initialData?: PipelineGroup[] }) {
  const groupsQ = useQuery({
    queryKey: ["groups"],
    queryFn: groupsApi.list,
    initialData,
    staleTime: 30_000,
  });
  const pipelinesQ = usePipelines();
  const statusesQ = usePipelineStatusAll();
  const del = useDeleteGroup();
  const move = useMovePipelineToGroup();
  const confirmDelete = useConfirmDelete(del.mutateAsync);
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const groups = groupsQ.data ?? [];
  const allPipelines = pipelinesQ.data ?? [];
  const pipelineDataAvailable = pipelinesQ.data !== undefined && !pipelinesQ.isError;
  const statusMap = useMemo(
    () => new Map((statusesQ.data ?? []).map((status) => [status.pipeline_id, status])),
    [statusesQ.data],
  );
  const rows = useMemo<GroupRow[]>(() => {
    return groups.map((group) => {
      const pipelines = allPipelines.filter((pipeline) => pipeline.pipelineGroup?.id === group.id);
      const healthy = pipelines.filter((pipeline) => pipelineState(statusMap.get(pipeline.id)) === "HEALTHY").length;
      const degraded = pipelines.filter((pipeline) => pipelineState(statusMap.get(pipeline.id)) === "DEGRADED").length;
      const stopped = pipelines.filter((pipeline) => {
        const state = pipelineState(statusMap.get(pipeline.id));
        return Boolean(state && state !== "HEALTHY" && state !== "DEGRADED");
      }).length;

      return {
        group,
        pipelines,
        healthy,
        degraded,
        stopped,
        unknown: pipelines.length - healthy - degraded - stopped,
      };
    });
  }, [allPipelines, groups, statusMap]);
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return rows;

    return rows.filter((row) =>
      [
        row.group.name,
        row.group.description,
        ...row.pipelines.map((pipeline) => pipeline.name),
      ].some((value) => (value ?? "").toLowerCase().includes(normalizedQuery)),
    );
  }, [query, rows]);

  const associatedCount = rows.reduce((total, row) => total + row.pipelines.length, 0);
  const unknownStatusCount = rows.reduce((total, row) => total + row.unknown, 0);
  const statusUnavailable = statusesQ.isError;
  const statusIsPartial = !statusesQ.isPending && !statusUnavailable && unknownStatusCount > 0;

  return (
    <div className="pb-4">
      <div className="flex flex-col gap-4 border-b border-[var(--color-border-subtle)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="t-label mb-2 text-[var(--color-accent-strong)]">Organización operativa</p>
          <h1 className="t-title mb-2">Organizar proyectos</h1>
          <p className="t-body max-w-[650px]">
            Agrupa proyectos por cliente, sede o entorno.
          </p>
        </div>
        {groups.length > 0 && (
          <Link href="/groups/new" className="w-full sm:w-auto">
            <Button variant="primary" className="min-h-10 w-full gap-2 sm:w-auto">
              <Plus size={16} aria-hidden="true" />
              Crear grupo
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-8">
      {groupsQ.isError && !groupsQ.data ? (
        <LoadError onRetry={() => void groupsQ.refetch()} />
      ) : groupsQ.isPending ? (
        <HoneycombLoader label="Cargando grupos" />
      ) : (
        <>
          {groupsQ.isError && (
            <Panel tone="danger" className="mb-4">
              <div role="alert">Mostramos la última lista disponible. No pudimos actualizar los grupos.</div>
            </Panel>
          )}

          {pipelinesQ.isError && (
            <Panel tone="danger" className="mb-4">
              <div role="alert" className="flex items-start gap-2">
                <Info className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                <span>No pudimos comprobar los proyectos asociados. La eliminación queda desactivada hasta actualizar la lista.</span>
              </div>
            </Panel>
          )}
          {statusesQ.isPending && associatedCount > 0 && (
            <Panel className="mb-4">
              <div role="status" aria-live="polite">Actualizando el estado operativo de los proyectos…</div>
            </Panel>
          )}
          {statusUnavailable && associatedCount > 0 && (
            <Panel tone="danger" className="mb-4">
              <div role="alert" className="flex items-start gap-2">
                <Info className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                <span>El estado operativo no está disponible. Los proyectos se muestran, pero no podemos confirmar su ejecución.</span>
              </div>
            </Panel>
          )}
          {statusIsPartial && (
            <Panel className="mb-4">
              <div role="status" aria-live="polite">Hay {unknownStatusCount} proyecto{unknownStatusCount === 1 ? "" : "s"} sin estado operativo confirmado.</div>
            </Panel>
          )}

          {groups.length === 0 ? (
            <Panel className="mx-auto flex min-h-[260px] max-w-2xl flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 grid size-12 place-items-center rounded-full border border-[var(--color-accent)] bg-[var(--color-bg-elev)] text-[var(--color-accent-strong)]">
                <FolderOpen size={22} aria-hidden="true" />
              </div>
              <h2 className="text-[18px] font-semibold text-[var(--color-fg-0)]">
                Organiza tus proyectos en grupos
              </h2>
              <p className="mt-2 max-w-md text-[14px] leading-6 text-[var(--color-fg-2)]">
                Crea un grupo para reunir proyectos por cliente, sede o entorno.
              </p>
              <Link href="/groups/new" className="mt-5">
                <Button variant="primary" className="min-h-11 gap-2">
                  <Plus size={16} aria-hidden="true" />
                  Crear el primer grupo
                </Button>
              </Link>
            </Panel>
          ) : (
            <>
              <div className="mb-4 flex justify-end">
                <GroupsToolbar query={query} onQueryChange={setQuery} />
              </div>
              {filteredRows.length === 0 ? (
                <Panel className="max-w-[640px]">
                  <h2 className="text-[16px] font-semibold text-[var(--color-fg-0)]">No hay coincidencias</h2>
                  <p className="mt-1 text-[14px] text-[var(--color-fg-2)]">Prueba con otro grupo, descripción o proyecto asociado.</p>
                  <Button type="button" variant="ghost" size="sm" className="mt-4" onClick={() => setQuery("")}>
                    Limpiar búsqueda
                  </Button>
                </Panel>
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table>
                      <THead>
                        <TH>#</TH>
                        <TH>GRUPO</TH>
                        <TH>PROYECTOS</TH>
                        <TH>ESTADO OPERATIVO</TH>
                        <TH className="text-right">ACCIONES</TH>
                      </THead>
                      <tbody>
                        {filteredRows.map((row) => (
                          <DesktopGroupRows
                            key={row.group.id}
                            row={row}
                            expanded={expandedGroupId === row.group.id}
                            groups={groups}
                            statusMap={statusMap}
                            statusPending={statusesQ.isPending}
                            statusUnavailable={statusUnavailable}
                            associationsPending={pipelinesQ.isPending && pipelinesQ.data === undefined}
                            associationsUnavailable={pipelinesQ.isError}
                            moving={move.isPending}
                            canDelete={pipelineDataAvailable && row.pipelines.length === 0}
                            onToggle={() => setExpandedGroupId(expandedGroupId === row.group.id ? null : row.group.id)}
                            onMove={(pipelineId, groupId) => move.mutateAsync({ pipelineId, groupId })}
                            onDelete={() => confirmDelete.ask(row.group.id, row.group.name)}
                          />
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  <div className="flex flex-col gap-3 md:hidden">
                    {filteredRows.map((row) => (
                      <MobileGroupCard
                        key={row.group.id}
                        row={row}
                        expanded={expandedGroupId === row.group.id}
                        groups={groups}
                        statusMap={statusMap}
                        statusPending={statusesQ.isPending}
                        statusUnavailable={statusUnavailable}
                        associationsPending={pipelinesQ.isPending && pipelinesQ.data === undefined}
                        associationsUnavailable={pipelinesQ.isError}
                        moving={move.isPending}
                        canDelete={pipelineDataAvailable && row.pipelines.length === 0}
                        onToggle={() => setExpandedGroupId(expandedGroupId === row.group.id ? null : row.group.id)}
                        onMove={(pipelineId, groupId) => move.mutateAsync({ pipelineId, groupId })}
                        onDelete={() => confirmDelete.ask(row.group.id, row.group.name)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
      </div>

      <DeleteResourceDialog
        pending={confirmDelete.pending}
        resourceLabel="grupo"
        impact="Solo se puede eliminar cuando no tenga proyectos asociados. Reasigna primero los proyectos desde el detalle del grupo."
        busy={del.isPending}
        error={confirmDelete.error}
        onConfirm={confirmDelete.confirm}
        onClose={confirmDelete.cancel}
      />
    </div>
  );
}

function GroupsToolbar({ query, onQueryChange }: { query: string; onQueryChange: (value: string) => void }) {
  return <SearchInput value={query} onChange={onQueryChange} placeholder="Nombre o propósito" />;
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Panel tone="danger">
      <div className="flex flex-wrap items-center justify-between gap-3" role="alert">
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--color-fg-0)]">No pudimos cargar los grupos</h2>
          <p className="mt-1 text-[14px] text-[var(--color-fg-2)]">Reintenta para consultar la lista actualizada.</p>
        </div>
        <Button type="button" variant="ghost" onClick={onRetry}>Reintentar</Button>
      </div>
    </Panel>
  );
}

type GroupItemProps = {
  row: GroupRow;
  expanded: boolean;
  groups: PipelineGroup[];
  statusMap: Map<number, PipelineStatus>;
  statusPending: boolean;
  statusUnavailable: boolean;
  associationsPending: boolean;
  associationsUnavailable: boolean;
  moving: boolean;
  canDelete: boolean;
  onToggle: () => void;
  onMove: (pipelineId: number, groupId: number) => Promise<unknown>;
  onDelete: () => void;
};

function DesktopGroupRows({ row, expanded, groups, statusMap, statusPending, statusUnavailable, associationsPending, associationsUnavailable, moving, canDelete, onToggle, onMove, onDelete }: GroupItemProps) {
  const detailsId = `group-details-${row.group.id}`;
  return <>
    <TR>
      <TD>{fmtId(row.group.id)}</TD>
      <TD>
        <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={detailsId} className="text-left text-[15px] font-black text-[var(--color-fg-0)] hover:text-[var(--color-accent)]">
          {row.group.name}
        </button>
        <p className="mt-1 max-w-[310px] text-[12px] text-[var(--color-fg-3)]">{row.group.description}</p>
      </TD>
      <TD>
        <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={detailsId} className="inline-flex items-center gap-2 font-semibold text-[var(--color-accent-strong)] hover:underline">
          <Users size={15} aria-hidden="true" />{row.pipelines.length} {row.pipelines.length === 1 ? "proyecto" : "proyectos"}
        </button>
      </TD>
      <TD><GroupStatus row={row} statusPending={statusPending} statusUnavailable={statusUnavailable} associationsPending={associationsPending} associationsUnavailable={associationsUnavailable} /></TD>
      <TD className="text-right">
        <GroupActions row={row} expanded={expanded} canDelete={canDelete} onToggle={onToggle} onDelete={onDelete} />
      </TD>
    </TR>
    {expanded && (
      <tr className="bg-[var(--color-bg-base)]">
        <td id={detailsId} colSpan={5} className="border-b border-[var(--color-border-subtle)] p-3 sm:p-4">
          <GroupProjects group={row.group} pipelines={row.pipelines} groups={groups} statusMap={statusMap} statusPending={statusPending} statusUnavailable={statusUnavailable} associationsPending={associationsPending} associationsUnavailable={associationsUnavailable} moving={moving} onMove={onMove} />
        </td>
      </tr>
    )}
  </>;
}

function MobileGroupCard({ row, expanded, groups, statusMap, statusPending, statusUnavailable, associationsPending, associationsUnavailable, moving, canDelete, onToggle, onMove, onDelete }: GroupItemProps) {
  const detailsId = `group-details-${row.group.id}`;
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="t-label">#{fmtId(row.group.id)}</div>
          <h2 className="mt-0.5 break-words text-[16px] font-black text-[var(--color-fg-0)]">{row.group.name}</h2>
          <p className="mt-1 text-[13px] text-[var(--color-fg-3)]">{row.group.description}</p>
        </div>
        <GroupStatus row={row} statusPending={statusPending} statusUnavailable={statusUnavailable} associationsPending={associationsPending} associationsUnavailable={associationsUnavailable} />
      </div>
      <p className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--color-fg-2)]">
        <Users size={15} aria-hidden="true" />{row.pipelines.length} {row.pipelines.length === 1 ? "proyecto asociado" : "proyectos asociados"}
      </p>
      <div className="mt-3">
        <GroupActions row={row} expanded={expanded} canDelete={canDelete} onToggle={onToggle} onDelete={onDelete} />
      </div>
      {expanded && (
        <div id={detailsId} className="mt-4 border-t border-[var(--color-border-subtle)] pt-4">
          <GroupProjects group={row.group} pipelines={row.pipelines} groups={groups} statusMap={statusMap} statusPending={statusPending} statusUnavailable={statusUnavailable} associationsPending={associationsPending} associationsUnavailable={associationsUnavailable} moving={moving} onMove={onMove} />
        </div>
      )}
    </Panel>
  );
}

function GroupActions({ row, expanded, canDelete, onToggle, onDelete }: Pick<GroupItemProps, "row" | "expanded" | "canDelete" | "onToggle" | "onDelete">) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onToggle} aria-expanded={expanded}>
        {expanded ? "Ocultar" : "Ver"}
      </Button>
      <Link href={`/groups/${row.group.id}/edit`}>
        <Button type="button" variant="ghost" size="sm">Editar</Button>
      </Link>
      <Button type="button" variant="danger" size="sm" disabled={!canDelete} title={canDelete ? "Eliminar grupo" : "La lista de proyectos debe estar disponible y vacía para eliminar el grupo"} onClick={onDelete}>Eliminar</Button>
    </div>
  );
}

function GroupProjects({ group, pipelines, groups, statusMap, statusPending, statusUnavailable, associationsPending, associationsUnavailable, moving, onMove }: Pick<GroupItemProps, "groups" | "statusMap" | "statusPending" | "statusUnavailable" | "associationsPending" | "associationsUnavailable" | "moving" | "onMove"> & { group: PipelineGroup; pipelines: Pipeline[] }) {
  if (associationsUnavailable) {
    return <p role="alert" className="text-[14px] text-[var(--color-danger)]">No pudimos comprobar los proyectos asociados a este grupo.</p>;
  }

  if (associationsPending) {
    return <p role="status" className="text-[14px] text-[var(--color-fg-3)]">Comprobando los proyectos asociados…</p>;
  }

  if (pipelines.length === 0) {
    return <p className="text-[14px] text-[var(--color-fg-3)]">Este grupo no tiene proyectos. Puedes eliminarlo o asociar un proyecto desde el detalle de ese proyecto.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-[var(--color-fg-0)]">Proyectos en {group.name}</h3>
        <Link href="/pipelines" className="text-[13px] font-semibold text-[var(--color-accent-strong)] hover:underline">Abrir proyectos</Link>
      </div>
      <div className="space-y-2">
        {pipelines.map((pipeline) => {
          const status = pipelineState(statusMap.get(pipeline.id));
          const moveId = `move-pipeline-${pipeline.id}`;
          return (
            <div key={pipeline.id} className="flex flex-wrap items-center justify-between gap-3 border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-3 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/pipelines/${pipeline.id}`} className="font-semibold text-[var(--color-fg-0)] hover:text-[var(--color-accent)]">{pipeline.name}</Link>
                  <PipelineStatus status={status} statusPending={statusPending} statusUnavailable={statusUnavailable} />
                </div>
                <p className="mt-1 truncate text-[12px] text-[var(--color-fg-3)]">{pipeline.dataSource?.name ?? "Sin broker"} → {pipeline.dataStore?.name ?? "Sin destino"}</p>
              </div>
              <div className="w-full sm:w-[185px]">
                <label htmlFor={moveId} className="mb-1 block text-[12px] font-semibold text-[var(--color-fg-3)]">Mover a</label>
                <Select
                  id={moveId}
                  title={groups.length > 1 ? "Reasignar a otro grupo" : "Crea otro grupo para poder reasignar este proyecto"}
                  value={String(group.id)}
                  disabled={moving || groups.length < 2}
                  className="!py-2 text-[13px]"
                  onChange={(event) => {
                    const nextGroupId = Number(event.target.value);
                    if (nextGroupId !== group.id) void onMove(pipeline.id, nextGroupId);
                  }}
                >
                  {groups.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </Select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipelineStatus({ status, statusPending, statusUnavailable }: { status?: string; statusPending: boolean; statusUnavailable: boolean }) {
  if (statusUnavailable) return <Pill state="error">NO DISPONIBLE</Pill>;
  if (statusPending) return <Pill state="starting">ACTUALIZANDO</Pill>;
  if (!status) return <Pill state="starting">SIN ESTADO</Pill>;
  return <Pill state={toPillState(status)}>{pipelineStatusLabel(status)}</Pill>;
}

function GroupStatus({ row, statusPending, statusUnavailable, associationsPending, associationsUnavailable }: Pick<GroupItemProps, "row" | "statusPending" | "statusUnavailable" | "associationsPending" | "associationsUnavailable">) {
  if (associationsUnavailable) return <Pill state="error">ASOCIACIONES NO DISPONIBLES</Pill>;
  if (associationsPending) return <Pill state="starting">COMPROBANDO PROYECTOS</Pill>;
  if (statusUnavailable) return <Pill state="error">NO DISPONIBLE</Pill>;
  if (statusPending && row.pipelines.length > 0) return <Pill state="starting">ACTUALIZANDO</Pill>;
  if (row.pipelines.length === 0) return <Pill state="idle">SIN PROYECTOS</Pill>;
  if (row.degraded > 0) return <Pill state="error">{row.degraded} CON INCIDENCIA{row.degraded === 1 ? "" : "S"}</Pill>;
  if (row.unknown > 0) return <Pill state="starting">{row.unknown} SIN ESTADO</Pill>;
  if (row.healthy === row.pipelines.length) return <Pill state="running">TODOS OPERATIVOS</Pill>;
  return <Pill state="idle">{row.stopped} DETENIDO{row.stopped === 1 ? "" : "S"}</Pill>;
}
