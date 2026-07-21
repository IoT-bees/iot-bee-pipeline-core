"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pipelinesApi } from "@/lib/api/endpoints/pipelines";
import { lifecycleApi } from "@/lib/api/endpoints/lifecycle";
import { idempotentDelete } from "@/lib/api/client";
import type { CreatePipelineRequest } from "@/lib/api/types";
import { useToasts } from "@/lib/store/useToasts";

export function usePipelines() {
  return useQuery({ queryKey: ["pipelines", "list"], queryFn: pipelinesApi.list });
}

export function usePipeline(id: number) {
  return useQuery({
    queryKey: ["pipelines", id],
    queryFn: () => pipelinesApi.get(id),
    enabled: id > 0,
  });
}

export function useCreatePipeline() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: CreatePipelineRequest) => pipelinesApi.create(b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      push({ kind: "success", message: "Proyecto creado." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useUpdatePipelineSource(pipelineId: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (newSourceId: number) =>
      pipelinesApi.updateSource(pipelineId, newSourceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines", pipelineId] });
      qc.invalidateQueries({ queryKey: ["pipelines", "list"] });
      push({ kind: "success", message: "Broker actualizado." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useUpdatePipelineStore(pipelineId: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (newStoreId: number) =>
      pipelinesApi.updateStore(pipelineId, newStoreId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines", pipelineId] });
      qc.invalidateQueries({ queryKey: ["pipelines", "list"] });
      push({ kind: "success", message: "Destino actualizado." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useUpdatePipelineSchema(pipelineId: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (newSchemaId: number) =>
      pipelinesApi.updateSchema(pipelineId, newSchemaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines", pipelineId] });
      qc.invalidateQueries({ queryKey: ["pipelines", "list"] });
      push({ kind: "success", message: "Esquema actualizado." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useUpdatePipelineGroup(pipelineId: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (newGroupId: number) =>
      pipelinesApi.updateGroup(pipelineId, newGroupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines", pipelineId] });
      qc.invalidateQueries({ queryKey: ["pipelines", "list"] });
      push({ kind: "success", message: "Grupo del proyecto actualizado." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useUpdatePipelineReplicas(pipelineId: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (replicationFactor: number) =>
      lifecycleApi.updateReplicas(pipelineId, replicationFactor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines", pipelineId] });
      qc.invalidateQueries({ queryKey: ["pipelines", "list"] });
      qc.invalidateQueries({ queryKey: ["pipelines", "status", "all"] });
      push({ kind: "success", message: "Réplicas actualizadas." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useDeletePipeline() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (id: number) => idempotentDelete(pipelinesApi.remove(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      push({ kind: "success", message: "Proyecto eliminado." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
