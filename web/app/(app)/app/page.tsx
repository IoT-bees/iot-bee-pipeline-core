import { serverFetch } from "@/lib/api/server";
import type {
  DataSource,
  DataStore,
  LicenseStatus,
  Pipeline,
  PipelineGroup,
  SchemaMap,
  SourceType,
  StoreType,
  ValidationSchema,
} from "@/lib/api/types";
import { AppDashboardClient, type DashboardInitial } from "./AppDashboardClient";

interface RawDataSource {
  id: number;
  name: string;
  sourceType: SourceType;
  dataSourceConfiguration: string;
  dataSourceDescription: string;
  createdAt?: string;
  updatedAt?: string;
}

interface RawDataStore {
  id: number;
  name: string;
  storeType: StoreType;
  dataStoreConfiguration: string;
  dataStoreDescription: string;
  createdAt?: string;
  updatedAt?: string;
}

interface RawValidationSchema {
  id?: number;
  name: string;
  schema: string;
  createdAt?: string;
  updatedAt?: string;
}

function safeParse(raw: string): SchemaMap {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as SchemaMap) : {};
  } catch {
    return {};
  }
}

async function tryFetch<T>(path: string, revalidate: number): Promise<T | undefined> {
  try {
    return await serverFetch<T>(path, { revalidate });
  } catch {
    return undefined;
  }
}

export default async function DashboardPage() {
  const [pipelines, rawSources, rawStores, rawSchemas, groups, license] = await Promise.all([
    tryFetch<Pipeline[]>("/pipelines", 15),
    tryFetch<RawDataSource[]>("/data-sources", 30),
    tryFetch<RawDataStore[]>("/data-stores", 30),
    tryFetch<RawValidationSchema[]>("/validation-schemas", 30),
    tryFetch<PipelineGroup[]>("/pipeline-groups", 30),
    tryFetch<LicenseStatus>("/license/status", 30),
  ]);

  const sources: DataSource[] | undefined = rawSources?.map((r) => ({
    id: r.id,
    name: r.name,
    sourceType: r.sourceType,
    dataSourceDescription: r.dataSourceDescription,
    config: { url: "", queue_name: "", consumer_name: "" },
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
  const stores: DataStore[] | undefined = rawStores?.map((r) => ({
    id: r.id,
    name: r.name,
    storeType: r.storeType,
    dataStoreDescription: r.dataStoreDescription,
    config:
      r.storeType === "INFLUX_DB"
        ? { url: "", data_base: "", measurement: "", token: "", tag_fields: [] }
        : { log_name: "" },
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
  const schemas: ValidationSchema[] | undefined = rawSchemas?.map((r) => ({
    id: r.id ?? 0,
    name: r.name,
    schema: safeParse(r.schema),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  const initial: DashboardInitial = {
    pipelines,
    sources,
    stores,
    schemas,
    groups,
    license,
  };
  return <AppDashboardClient initial={initial} />;
}
