"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/endpoints/admin";
import type { AuditFilters } from "@/lib/api/types";

export function useAuditEvents(filters: AuditFilters) {
  return useInfiniteQuery({
    queryKey: ["admin", "audit", filters],
    queryFn: ({ pageParam }) =>
      adminApi.listAudit({ ...filters, cursor: pageParam, limit: 50 }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
