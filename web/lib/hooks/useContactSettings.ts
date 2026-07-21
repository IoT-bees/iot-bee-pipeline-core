"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/endpoints/admin";
import { useToasts } from "@/lib/store/useToasts";

export function useUpdateContactSettings() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: adminApi.updateContactSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "system", "contact-settings"] });
      push({ kind: "success", message: "Datos de contacto actualizados." });
    },
    onError: (error: Error) => push({ kind: "error", message: error.message }),
  });
}
