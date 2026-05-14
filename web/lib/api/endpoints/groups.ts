import { api } from "../client";
import type { CreatePipelineGroupRequest, PipelineGroup } from "../types";

export const groupsApi = {
  list: () => api<PipelineGroup[]>("/pipeline-groups"),
  get: (id: number) => api<PipelineGroup>(`/pipeline-groups/${id}`),
  create: (b: CreatePipelineGroupRequest) =>
    api<PipelineGroup>("/pipeline-groups", {
      method: "POST",
      body: JSON.stringify(b),
    }),
  remove: (id: number) =>
    api<{ message: string }>(`/pipeline-groups/${id}`, { method: "DELETE" }),
};
