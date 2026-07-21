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
  updateSource: (pid: number, sid: number): Promise<void> =>
    api<null>(`/pipelines/data_source/${pid}/${sid}`, { method: "PUT" }).then(
      () => undefined,
    ),
  updateStore: (pid: number, sid: number): Promise<void> =>
    api<null>(`/pipelines/store/${pid}/${sid}`, { method: "PUT" }).then(
      () => undefined,
    ),
  updateSchema: (pid: number, sid: number): Promise<void> =>
    api<null>(`/pipelines/validation_schema/${pid}/${sid}`, {
      method: "PUT",
    }).then(() => undefined),
  updateGroup: (pid: number, gid: number): Promise<void> =>
    api<null>(`/pipelines/group/${pid}/${gid}`, { method: "PUT" }).then(
      () => undefined,
    ),
  updateReplicas: (pid: number, rf: number): Promise<void> =>
    api<null>(`/pipelines/replication_factor/${pid}/${rf}`, {
      method: "PUT",
    }).then(() => undefined),
  remove: (id: number) =>
    api<{ message: string }>(`/pipelines/${id}`, { method: "DELETE" }),
};
