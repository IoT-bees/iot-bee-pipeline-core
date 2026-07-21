"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/endpoints/admin";
import { useToasts } from "@/lib/store/useToasts";
import type { CreatePlanRequest, PatchPlanRequest } from "@/lib/api/types";

export function usePlans() {
  return useQuery({
    queryKey: ["admin", "plans"],
    queryFn: adminApi.listPlans,
    staleTime: 60_000,
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: CreatePlanRequest) => adminApi.createPlan(b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
      push({ kind: "success", message: "Plan creado." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function usePatchPlan(id: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: PatchPlanRequest) => adminApi.patchPlan(id, b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
      push({ kind: "success", message: "Plan actualizado." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (id: number) => adminApi.deletePlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
      push({ kind: "success", message: "Plan eliminado." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
