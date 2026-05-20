"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { groupsApi } from "@/lib/api/endpoints/groups";
import { idempotentDelete } from "@/lib/api/client";
import type { CreatePipelineGroupRequest } from "@/lib/api/types";
import { useToasts } from "@/lib/store/useToasts";

export function useGroups() {
  return useQuery({ queryKey: ["groups"], queryFn: groupsApi.list, staleTime: 30_000 });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: CreatePipelineGroupRequest) => groupsApi.create(b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      push({ kind: "success", message: "group created" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (id: number) => idempotentDelete(groupsApi.remove(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      push({ kind: "success", message: "group deleted" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
