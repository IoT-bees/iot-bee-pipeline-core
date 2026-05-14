"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { lifecycleApi } from "@/lib/api/endpoints/lifecycle";
import { useToasts } from "@/lib/store/useToasts";

export function useStopPipeline() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (id: number) => lifecycleApi.stop(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      push({ kind: "success", message: `stopped pipeline #${id}` });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
