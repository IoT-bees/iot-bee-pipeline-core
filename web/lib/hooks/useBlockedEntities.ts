"use client";
import { useMemo } from "react";
import { usePipelines } from "@/lib/hooks/usePipelines";
import { usePipelineStatusAll } from "@/lib/hooks/usePipelineStatusAll";
import type { Pipeline, PipelineStatus } from "@/lib/api/types";

export type BlockingKind = "source" | "store" | "schema" | "group";

export interface BlockingPipeline {
  id: number;
  name: string;
  status: string;
}

export interface BlockedEntitiesResult {
  isLoading: boolean;
  blockedById: Map<number, BlockingPipeline[]>;
}

const RUNNING_STATUSES = new Set(["Healthy", "Degraded"]);

function entityIdOf(p: Pipeline, kind: BlockingKind): number {
  switch (kind) {
    case "source":
      return p.dataSource.id;
    case "store":
      return p.dataStore.id;
    case "schema":
      return p.dataValidationSchema.id;
    case "group":
      return p.pipelineGroup.id;
  }
}

export function useBlockedEntities(kind: BlockingKind): BlockedEntitiesResult {
  const pipelinesQ = usePipelines();
  const statusQ = usePipelineStatusAll();

  const blockedById = useMemo(() => {
    const map = new Map<number, BlockingPipeline[]>();
    const pipelines = pipelinesQ.data ?? [];
    const statuses = statusQ.data ?? [];
    const statusByPipelineId = new Map<number, PipelineStatus>(
      statuses.map((s) => [s.pipeline_id, s]),
    );

    for (const p of pipelines) {
      const st = statusByPipelineId.get(p.id);
      if (!st) continue;
      if (!RUNNING_STATUSES.has(st.pipeline_general_status)) continue;
      const eid = entityIdOf(p, kind);
      const entry: BlockingPipeline = {
        id: p.id,
        name: p.name,
        status: st.pipeline_general_status,
      };
      const arr = map.get(eid);
      if (arr) arr.push(entry);
      else map.set(eid, [entry]);
    }
    return map;
  }, [pipelinesQ.data, statusQ.data, kind]);

  return {
    isLoading: pipelinesQ.isLoading || statusQ.isLoading,
    blockedById,
  };
}

export function useBlockingPipelines(
  kind: BlockingKind,
  entityId: number | undefined,
): { isLoading: boolean; pipelines: BlockingPipeline[] } {
  const { isLoading, blockedById } = useBlockedEntities(kind);
  const pipelines =
    entityId === undefined ? [] : blockedById.get(entityId) ?? [];
  return { isLoading, pipelines };
}
