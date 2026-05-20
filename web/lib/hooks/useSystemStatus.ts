"use client";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/endpoints/admin";

export function useSystemStatus() {
  return useQuery({
    queryKey: ["admin", "system", "status"],
    queryFn: adminApi.systemStatus,
    refetchInterval: 10_000,
  });
}
