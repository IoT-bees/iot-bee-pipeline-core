import { serverFetch } from "@/lib/api/server";
import type { Pipeline } from "@/lib/api/types";
import { PipelinesClient } from "./PipelinesClient";

export default async function PipelinesPage() {
  let initialData: Pipeline[] | undefined;
  try {
    initialData = await serverFetch<Pipeline[]>("/pipelines", { revalidate: 15 });
  } catch {
    // Backend unreachable / unauthenticated: client will fetch via React Query.
  }
  return <PipelinesClient initialData={initialData} />;
}
