"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pipelinesApi } from "@/lib/api/endpoints/pipelines";
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
      push({ kind: "success", message: "pipeline created" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useDeletePipeline() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (id: number) => pipelinesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      push({ kind: "success", message: "pipeline deleted" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
