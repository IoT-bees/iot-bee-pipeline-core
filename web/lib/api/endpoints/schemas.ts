import { api } from "../client";
import type { CreateValidationSchemaRequest, ValidationSchema } from "../types";

export const schemasApi = {
  list: () => api<ValidationSchema[]>("/validation-schemas"),
  get: (id: number) => api<ValidationSchema>(`/validation-schemas/${id}`),
  create: (b: CreateValidationSchemaRequest) =>
    api<ValidationSchema>("/validation-schemas", {
      method: "POST",
      body: JSON.stringify(b),
    }),
  update: (id: number, b: CreateValidationSchemaRequest) =>
    api<ValidationSchema>(`/validation-schemas/${id}`, {
      method: "PUT",
      body: JSON.stringify(b),
    }),
  rename: (id: number, name: string) =>
    api<ValidationSchema>(`/validation-schemas/${id}/name`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),
  remove: (id: number) =>
    api<{ message: string }>(`/validation-schemas/${id}`, { method: "DELETE" }),
};
