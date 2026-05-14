"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schemasApi } from "@/lib/api/endpoints/schemas";
import type { CreateValidationSchemaRequest } from "@/lib/api/types";
import { useToasts } from "@/lib/store/useToasts";

export function useSchemas() {
  return useQuery({ queryKey: ["schemas"], queryFn: schemasApi.list });
}

export function useSchema(id: number) {
  return useQuery({
    queryKey: ["schemas", id],
    queryFn: () => schemasApi.get(id),
    enabled: id > 0,
  });
}

export function useCreateSchema() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: CreateValidationSchemaRequest) => schemasApi.create(b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schemas"] });
      push({ kind: "success", message: "schema created" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useUpdateSchema(id: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: CreateValidationSchemaRequest) => schemasApi.update(id, b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schemas"] });
      push({ kind: "success", message: "schema updated" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useDeleteSchema() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (id: number) => schemasApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schemas"] });
      push({ kind: "success", message: "schema deleted" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
