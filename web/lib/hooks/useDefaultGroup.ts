"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { groupsApi } from "@/lib/api/endpoints/groups";
import { useGroups } from "@/lib/hooks/useGroups";
import type { PipelineGroup } from "@/lib/api/types";

const DEFAULT_NAME = "Default";

export function useDefaultGroup() {
  const qc = useQueryClient();
  const groups = useGroups();

  const createGroup = useMutation({
    mutationFn: async (name: string) => {
      await groupsApi.create({ name, description: "auto-created default group" });
      const fresh = await groupsApi.list();
      qc.setQueryData(["groups"], fresh);
      const created = fresh.find((g) => g.name === name);
      if (!created) throw new Error("default group was created but not found");
      return created;
    },
  });

  const existing: PipelineGroup | undefined = groups.data?.find(
    (g) => g.name === DEFAULT_NAME,
  );

  const ensure = async (): Promise<PipelineGroup> => {
    if (existing) return existing;
    return createGroup.mutateAsync(DEFAULT_NAME);
  };

  return { existing, ensure, ready: !groups.isLoading };
}
