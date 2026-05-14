import { api } from "../client";
import type { CreateDataStoreRequest, DataStore } from "../types";

export const storesApi = {
  list: () => api<DataStore[]>("/data-stores"),
  get: (id: number) => api<DataStore>(`/data-stores/${id}`),
  create: (b: CreateDataStoreRequest) =>
    api<DataStore>("/data-stores", { method: "POST", body: JSON.stringify(b) }),
  update: (id: number, b: CreateDataStoreRequest) =>
    api<DataStore>(`/data-stores/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  remove: (id: number) =>
    api<{ message: string }>(`/data-stores/${id}`, { method: "DELETE" }),
};
