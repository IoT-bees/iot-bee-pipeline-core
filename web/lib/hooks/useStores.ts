"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storesApi } from "@/lib/api/endpoints/stores";
import { idempotentDelete } from "@/lib/api/client";
import type { CreateDataStoreRequest } from "@/lib/api/types";
import { useToasts } from "@/lib/store/useToasts";

export function useStores() {
  return useQuery({ queryKey: ["stores"], queryFn: storesApi.list, staleTime: 30_000 });
}

export function useStore(id: number) {
  return useQuery({
    queryKey: ["stores", id],
    queryFn: () => storesApi.get(id),
    enabled: id > 0,
  });
}

export function useCreateStore() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: CreateDataStoreRequest) => storesApi.create(b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stores"] });
      push({ kind: "success", message: "Destino creado. Verifícalo antes de asignarlo a un proyecto." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useUpdateStore(id: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: CreateDataStoreRequest) => storesApi.update(id, b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stores"] });
      push({ kind: "success", message: "Cambios guardados. Verifica el destino si modificaste la conexión." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useDeleteStore() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (id: number) => idempotentDelete(storesApi.remove(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stores"] });
      push({ kind: "success", message: "Destino eliminado." });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useTestStore() {
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (id: number) => storesApi.test(id),
    onSuccess: (res) => push({
      kind: res.ok ? "success" : "error",
      message: res.message,
    }),
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
