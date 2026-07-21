"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export type ApiHealth = { status: "ok" };

export async function getApiHealth(): Promise<ApiHealth> {
  return api<ApiHealth>("/health", { cache: "no-store" }, (value) => {
    if (
      typeof value !== "object" ||
      value === null ||
      !("status" in value) ||
      value.status !== "ok"
    ) {
      throw new Error("Respuesta de salud inválida");
    }
    return { status: "ok" };
  });
}

export function useApiHealth(enabled: boolean) {
  return useQuery({
    queryKey: ["api", "health"],
    queryFn: getApiHealth,
    enabled,
    staleTime: 10_000,
    refetchInterval: enabled ? 30_000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  });
}
