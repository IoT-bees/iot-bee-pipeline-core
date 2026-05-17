import { api } from "../client";
import { parseJsonObject } from "../parseJson";
import type {
  CreateValidationSchemaRequest,
  SchemaMap,
  ValidationSchema,
} from "../types";

interface RawValidationSchema {
  id?: number;
  name: string;
  schema: string;
  createdAt?: string;
  updatedAt?: string;
}

function normalize(raw: RawValidationSchema, fallbackId?: number): ValidationSchema {
  return {
    id: raw.id ?? fallbackId ?? 0,
    name: raw.name,
    schema: (parseJsonObject(raw.schema) ?? {}) as SchemaMap,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export const schemasApi = {
  list: async (): Promise<ValidationSchema[]> => {
    const raw = await api<RawValidationSchema[]>("/validation-schemas");
    return raw.map((r) => normalize(r));
  },
  get: async (id: number): Promise<ValidationSchema> => {
    const raw = await api<RawValidationSchema>(`/validation-schemas/${id}`);
    return normalize(raw, id);
  },
  create: (b: CreateValidationSchemaRequest): Promise<void> =>
    api<null>("/validation-schemas", {
      method: "POST",
      body: JSON.stringify(b),
    }).then(() => undefined),
  update: async (
    id: number,
    b: CreateValidationSchemaRequest,
  ): Promise<ValidationSchema> => {
    const raw = await api<RawValidationSchema>(`/validation-schemas/${id}`, {
      method: "PUT",
      body: JSON.stringify({ schema: b.schema }),
    });
    return normalize(raw, id);
  },
  rename: async (id: number, name: string): Promise<ValidationSchema> => {
    const raw = await api<RawValidationSchema>(
      `/validation-schemas/${id}/name`,
      {
        method: "PUT",
        body: JSON.stringify({ name }),
      },
    );
    return normalize(raw, id);
  },
  remove: (id: number) =>
    api<{ message: string }>(`/validation-schemas/${id}`, { method: "DELETE" }),
};
