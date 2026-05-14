import { api } from "../client";
import type { CreateDataSourceRequest, DataSource } from "../types";

export const sourcesApi = {
  list: () => api<DataSource[]>("/data-sources"),
  get: (id: number) => api<DataSource>(`/data-sources/${id}`),
  create: (body: CreateDataSourceRequest) =>
    api<DataSource>("/data-sources", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: CreateDataSourceRequest) =>
    api<DataSource>(`/data-sources/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  remove: (id: number) =>
    api<{ message: string }>(`/data-sources/${id}`, { method: "DELETE" }),
};
