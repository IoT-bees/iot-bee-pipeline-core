import { api } from "../client";
import type { CreatePipelineRequest, Pipeline } from "../types";

export const pipelinesApi = {
  list: () => api<Pipeline[]>("/pipelines"),
  get: (id: number) => api<Pipeline>(`/pipelines/${id}`),
  byGroup: (gid: number) => api<Pipeline[]>(`/pipelines/group/${gid}`),
  create: (b: CreatePipelineRequest): Promise<void> =>
    api<null>("/pipelines", { method: "POST", body: JSON.stringify(b) }).then(
      () => undefined,
    ),
  remove: (id: number) =>
    api<{ message: string }>(`/pipelines/${id}`, { method: "DELETE" }),
};
