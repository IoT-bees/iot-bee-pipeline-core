"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sourcesApi } from "@/lib/api/endpoints/sources";
import { idempotentDelete } from "@/lib/api/client";
import type { CreateDataSourceRequest } from "@/lib/api/types";
import { useToasts } from "@/lib/store/useToasts";

export function useSources() {
  return useQuery({ queryKey: ["sources"], queryFn: sourcesApi.list, staleTime: 30_000 });
}

export function useSource(id: number) {
  return useQuery({
    queryKey: ["sources", id],
    queryFn: () => sourcesApi.get(id),
    enabled: id > 0,
  });
}

export function useCreateSource() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: CreateDataSourceRequest) => sourcesApi.create(b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      push({ kind: "success", message: "source created" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useUpdateSource(id: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: CreateDataSourceRequest) => sourcesApi.update(id, b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      push({ kind: "success", message: "source updated" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useDeleteSource() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (id: number) => idempotentDelete(sourcesApi.remove(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      push({ kind: "success", message: "source deleted" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useTestSource() {
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (id: number) => sourcesApi.test(id),
    onSuccess: (res) => push({ kind: "success", message: res.message }),
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
