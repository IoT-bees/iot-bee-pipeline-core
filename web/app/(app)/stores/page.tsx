import { serverFetch } from "@/lib/api/server";
import type { DataStore, StoreType } from "@/lib/api/types";
import { StoresClient } from "./StoresClient";

interface RawDataStore {
  id: number;
  name: string;
  storeType: StoreType;
  dataStoreConfiguration: string;
  dataStoreDescription: string;
  createdAt?: string;
  updatedAt?: string;
}

export default async function StoresPage() {
  let initialData: DataStore[] | undefined;
  try {
    const raw = await serverFetch<RawDataStore[]>("/data-stores", { revalidate: 30 });
    initialData = raw.map((r) => ({
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
  } catch {
    // Backend unreachable / unauthenticated: client will fetch via React Query.
  }
  return <StoresClient initialData={initialData} />;
}
