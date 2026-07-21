import { api } from "../client";
import type { PipelineStatus } from "../types";

export const lifecycleApi = {
  statusAll: () => api<PipelineStatus[]>("/pipeline-lifecycle/status"),
  status: (id: number) =>
    api<PipelineStatus>(`/pipeline-lifecycle/status/${id}`),
  start: (id: number) =>
    api<null>(`/pipeline-lifecycle/start/${id}`, { method: "POST" }),
  stop: (id: number) =>
    api<null>(`/pipeline-lifecycle/stop/${id}`, { method: "POST" }),
  updateReplicas: (id: number, replicas: number): Promise<void> =>
    api<null>(
      `/pipeline-lifecycle/update-replication-factor/${id}/${replicas}`,
      { method: "PUT" },
    ).then(() => undefined),
};
