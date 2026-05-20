import { serverFetch } from "@/lib/api/server";
import type { DataSource, SourceType } from "@/lib/api/types";
import { SourcesClient } from "./SourcesClient";

interface RawDataSource {
  id: number;
  name: string;
  sourceType: SourceType;
  dataSourceConfiguration: string;
  dataSourceDescription: string;
  createdAt?: string;
  updatedAt?: string;
}

export default async function SourcesPage() {
  let initialData: DataSource[] | undefined;
  try {
    const raw = await serverFetch<RawDataSource[]>("/data-sources", { revalidate: 30 });
    initialData = raw.map((r) => ({
      id: r.id,
      name: r.name,
      sourceType: r.sourceType,
      dataSourceDescription: r.dataSourceDescription,
      config: { url: "", queue_name: "", consumer_name: "" },
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  } catch {
    // Backend unreachable / unauthenticated: client will fetch via React Query.
  }
  return <SourcesClient initialData={initialData} />;
}
