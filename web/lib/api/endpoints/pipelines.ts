import { api } from "../client";
import type { CreatePipelineRequest, Pipeline } from "../types";

export const pipelinesApi = {
  list: () => api<Pipeline[]>("/pipelines"),
  get: (id: number) => api<Pipeline>(`/pipelines/${id}`),
  byGroup: (gid: number) => api<Pipeline[]>(`/pipelines/group/${gid}`),
  create: (b: CreatePipelineRequest) =>
    api<Pipeline>("/pipelines", { method: "POST", body: JSON.stringify(b) }),
  remove: (id: number) =>
    api<{ message: string }>(`/pipelines/${id}`, { method: "DELETE" }),
  assignSource: (pipeline_id: number, data_source_id: number) =>
    api<Pipeline>("/pipelines/data_source", {
      method: "PUT",
      body: JSON.stringify({ pipeline_id, data_source_id }),
    }),
  assignStore: (pipeline_id: number, data_store_id: number) =>
    api<Pipeline>("/pipelines/data_store", {
      method: "PUT",
      body: JSON.stringify({ pipeline_id, data_store_id }),
    }),
  assignSchema: (pipeline_id: number, validation_schema_id: number) =>
    api<Pipeline>("/pipelines/validation_schema", {
      method: "PUT",
      body: JSON.stringify({ pipeline_id, validation_schema_id }),
    }),
  assignGroup: (pipeline_id: number, group_id: number) =>
    api<Pipeline>("/pipelines/group", {
      method: "PUT",
      body: JSON.stringify({ pipeline_id, group_id }),
    }),
};
