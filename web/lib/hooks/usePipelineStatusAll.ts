"use client";
import { useQuery } from "@tanstack/react-query";
import { lifecycleApi } from "@/lib/api/endpoints/lifecycle";

export function usePipelineStatusAll() {
  return useQuery({
    queryKey: ["pipelines", "status", "all"],
    queryFn: lifecycleApi.statusAll,
    refetchInterval: 5000,
  });
}
