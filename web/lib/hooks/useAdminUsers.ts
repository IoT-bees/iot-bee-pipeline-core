"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/endpoints/admin";
import { useToasts } from "@/lib/store/useToasts";
import type {
  CreateAdminUserRequest,
  PatchAdminUserRequest,
} from "@/lib/api/types";

export function useAdminUsers() {
  return useQuery({ queryKey: ["admin", "users"], queryFn: adminApi.listUsers });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: CreateAdminUserRequest) => adminApi.createUser(b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      push({ kind: "success", message: "user created" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function usePatchAdminUser(id: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: PatchAdminUserRequest) => adminApi.patchUser(id, b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      push({ kind: "success", message: "user updated" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useDeactivateAdminUser() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (id: number) => adminApi.deactivateUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      push({ kind: "success", message: "user deactivated" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
