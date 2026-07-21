"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { MeResponse } from "@/lib/api/types";

export function useAuthMe() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<MeResponse>("/auth/me"),
    staleTime: 60_000,
  });
}
