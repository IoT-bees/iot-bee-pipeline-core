import { api } from "../client";
import type { PipelineStatus } from "../types";

export const lifecycleApi = {
  statusAll: () => api<PipelineStatus[]>("/pipeline-lifecycle/status"),
  status: (id: number) =>
    api<PipelineStatus>(`/pipeline-lifecycle/status/${id}`),
  start: (id: number) =>
    api<PipelineStatus>(`/pipeline-lifecycle/start/${id}`, { method: "POST" }),
  stop: (id: number) =>
    api<PipelineStatus>(`/pipeline-lifecycle/stop/${id}`, { method: "POST" }),
};
