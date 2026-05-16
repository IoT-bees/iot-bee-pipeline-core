import { api } from "../client";
import { parseJsonObject } from "../parseJson";
import type {
  CreateDataSourceRequest,
  DataSource,
  KafkaConfig,
  ConnectionTestResponse,
  MqttConfig,
  RabbitmqConfig,
  SourceType,
} from "../types";

interface RawDataSource {
  id: number;
  name: string;
  sourceType: SourceType;
  dataSourceConfiguration: string;
  dataSourceDescription: string;
  createdAt?: string;
  updatedAt?: string;
}

function emptyConfig(
  type: SourceType,
): RabbitmqConfig | MqttConfig | KafkaConfig {
  if (type === "RABBIT_MQ") return { url: "", queue_name: "", consumer_name: "" };
  if (type === "MQTT") return { broker_url: "", topic: "", client_id: "" };
  return { brokers: [], topic: "", group_id: "" };
}

function parseConfig(
  type: SourceType,
  raw: string,
): RabbitmqConfig | MqttConfig | KafkaConfig {
  const parsed = parseJsonObject(raw);
  if (parsed === null) return emptyConfig(type);

  if (type === "RABBIT_MQ") {
    return {
      url: String(parsed.url ?? ""),
      queue_name: String(parsed.queue_name ?? ""),
      consumer_name: String(parsed.consumer_name ?? ""),
    };
  }
  if (type === "MQTT") {
    return {
      broker_url: String(parsed.broker_url ?? ""),
      topic: String(parsed.topic ?? ""),
      client_id: String(parsed.client_id ?? ""),
    };
  }
  return {
    brokers: Array.isArray(parsed.brokers)
      ? (parsed.brokers as string[])
      : typeof parsed.brokers === "string"
      ? (parsed.brokers as string).split(",").map((s) => s.trim())
      : [],
    topic: String(parsed.topic ?? ""),
    group_id: String(parsed.group_id ?? ""),
  };
}

function normalize(raw: RawDataSource): DataSource {
  return {
    id: raw.id,
    name: raw.name,
    sourceType: raw.sourceType,
    dataSourceDescription: raw.dataSourceDescription,
    config: parseConfig(raw.sourceType, raw.dataSourceConfiguration),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export const sourcesApi = {
  list: async (): Promise<DataSource[]> => {
    const raw = await api<RawDataSource[]>("/data-sources");
    return raw.map(normalize);
  },
  get: async (id: number): Promise<DataSource> => {
    const raw = await api<RawDataSource>(`/data-sources/${id}`);
    return normalize(raw);
  },
  create: (b: CreateDataSourceRequest): Promise<void> =>
    api<null>("/data-sources", {
      method: "POST",
      body: JSON.stringify(b),
    }).then(() => undefined),
  update: async (id: number, b: CreateDataSourceRequest): Promise<DataSource> => {
    const raw = await api<RawDataSource>(`/data-sources/${id}`, {
      method: "PUT",
      body: JSON.stringify(b),
    });
    return normalize(raw);
  },
  remove: (id: number) =>
    api<{ message: string }>(`/data-sources/${id}`, { method: "DELETE" }),
  test: (id: number) =>
    api<ConnectionTestResponse>(`/data-sources/${id}/test`, { method: "POST" }),
};
