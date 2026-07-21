"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, idempotentDelete } from "@/lib/api/client";
import { groupsApi } from "@/lib/api/endpoints/groups";
import { pipelinesApi } from "@/lib/api/endpoints/pipelines";
import type { CreatePipelineGroupRequest } from "@/lib/api/types";
import { useToasts } from "@/lib/store/useToasts";

export function useGroups() {
  return useQuery({ queryKey: ["groups"], queryFn: groupsApi.list, staleTime: 30_000 });
}

export function useGroup(id: number) {
  return useQuery({ queryKey: ["groups", id], queryFn: () => groupsApi.get(id), enabled: Number.isFinite(id) });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: CreatePipelineGroupRequest) => groupsApi.create(b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      push({ kind: "success", message: "Grupo creado." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: async (id: number) => {
      try {
        return await idempotentDelete(groupsApi.remove(id));
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          throw new Error("No puedes eliminar este grupo porque todavía tiene proyectos asociados.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      push({ kind: "success", message: "Grupo eliminado." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useUpdateGroup(id: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: CreatePipelineGroupRequest) => groupsApi.update(id, b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      push({ kind: "success", message: "Grupo actualizado." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useMovePipelineToGroup() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: ({ pipelineId, groupId }: { pipelineId: number; groupId: number }) =>
      pipelinesApi.updateGroup(pipelineId, groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      qc.invalidateQueries({ queryKey: ["groups"] });
      push({ kind: "success", message: "Proyecto reasignado al grupo" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
