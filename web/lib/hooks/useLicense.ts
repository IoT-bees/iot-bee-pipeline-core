"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { licenseApi } from "@/lib/api/endpoints/license";
import { useToasts } from "@/lib/store/useToasts";

export function useLicenseStatus() {
  return useQuery({
    queryKey: ["license", "status"],
    queryFn: licenseApi.status,
    retry: 3,
    retryDelay: 1000,
    refetchOnMount: "always",
  });
}

export function useActivateLicense() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (licenseKey: string) => licenseApi.activate({ licenseKey }),
    onSuccess: (status) => {
      qc.setQueryData(["license", "status"], status);
      qc.invalidateQueries({ queryKey: ["license"] });
      push({ kind: "success", message: `license activated: ${status.plan}` });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useDeactivateLicense() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: licenseApi.deactivate,
    onSuccess: (status) => {
      qc.setQueryData(["license", "status"], status);
      qc.invalidateQueries({ queryKey: ["license"] });
      push({ kind: "success", message: "license deactivated" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
