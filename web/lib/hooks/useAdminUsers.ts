"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/endpoints/admin";
import { useToasts } from "@/lib/store/useToasts";
import type {
  CreateAdminUserRequest,
  AdminUsersFilters,
  PatchAdminUserRequest,
} from "@/lib/api/types";

export function useAdminUsers(filters: AdminUsersFilters = {}) {
  return useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: () => adminApi.listUsers(filters),
    staleTime: 60_000,
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: CreateAdminUserRequest) => adminApi.createUser(b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      push({ kind: "success", message: "Usuario creado." });
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
      push({ kind: "success", message: "Usuario actualizado." });
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
      push({ kind: "success", message: "Usuario desactivado." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
