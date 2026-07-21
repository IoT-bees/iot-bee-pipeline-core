"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/endpoints/admin";
import { useToasts } from "@/lib/store/useToasts";
import type { PatchOrganizationRequest } from "@/lib/api/types";

export function useOrganization() {
  return useQuery({
    queryKey: ["admin", "organization"],
    queryFn: adminApi.organization,
    staleTime: 60_000,
  });
}

export function usePatchOrganization() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: PatchOrganizationRequest) => adminApi.patchOrganization(b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "organization"] });
      push({ kind: "success", message: "Organización actualizada." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
