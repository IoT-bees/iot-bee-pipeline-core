import { api } from "../client";
import { rawDataStoreSchema, validated } from "../contracts";
import { parseJsonObject } from "../parseJson";
import type {
  CreateDataStoreRequest,
  ConnectionTestResponse,
  DataStore,
  InfluxDbConfig,
  LocalLogConfig,
  StoreType,
  WebhookConfig,
} from "../types";

interface RawDataStore {
  id: number;
  name: string;
  storeType: StoreType;
  dataStoreConfiguration: string;
  dataStoreDescription: string;
  createdAt?: string;
  updatedAt?: string;
}

function emptyConfig(type: StoreType): InfluxDbConfig | LocalLogConfig | WebhookConfig {
  if (type === "INFLUX_DB") {
    return { url: "", data_base: "", measurement: "", token: "", tag_fields: [] };
  }
  if (type === "WEBHOOK") {
    return { url: "", bearer_token: "" };
  }
  return { log_name: "" };
}

function parseConfig(
  type: StoreType,
  raw: string,
): InfluxDbConfig | LocalLogConfig | WebhookConfig {
  const parsed = parseJsonObject(raw);
  if (parsed === null) return emptyConfig(type);

  if (type === "INFLUX_DB") {
    return {
      url: String(parsed.url ?? ""),
      data_base: String(parsed.data_base ?? ""),
      measurement: String(parsed.measurement ?? ""),
      token: String(parsed.token ?? ""),
      tag_fields: Array.isArray(parsed.tag_fields)
        ? (parsed.tag_fields as string[])
        : [],
    };
  }
  if (type === "WEBHOOK") {
    return {
      url: String(parsed.url ?? ""),
      bearer_token: parsed.bearer_token ? String(parsed.bearer_token) : "",
    };
  }
  return { log_name: String(parsed.log_name ?? "") };
}

function normalize(raw: RawDataStore): DataStore {
  return {
    id: raw.id,
    name: raw.name,
    storeType: raw.storeType,
    dataStoreDescription: raw.dataStoreDescription,
    config: parseConfig(raw.storeType, raw.dataStoreConfiguration),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export const storesApi = {
  list: async (): Promise<DataStore[]> => {
    const raw = await api<RawDataStore[]>(
      "/data-stores",
      {},
      validated(rawDataStoreSchema.array()),
    );
    return raw.map(normalize);
  },
  get: async (id: number): Promise<DataStore> => {
    const raw = await api<RawDataStore>(
      `/data-stores/${id}`,
      {},
      validated(rawDataStoreSchema),
    );
    return normalize(raw);
  },
  create: (b: CreateDataStoreRequest): Promise<void> =>
    api<null>("/data-stores", {
      method: "POST",
      body: JSON.stringify(b),
    }).then(() => undefined),
  update: (id: number, b: CreateDataStoreRequest): Promise<void> =>
    api<null>(`/data-stores/${id}`, {
      method: "PUT",
      body: JSON.stringify(b),
    }).then(() => undefined),
  remove: (id: number) =>
    api<{ message: string }>(`/data-stores/${id}`, { method: "DELETE" }),
  test: (id: number) =>
    api<ConnectionTestResponse>(`/data-stores/${id}/test`, { method: "POST" }),
};
