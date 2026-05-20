import { serverFetch } from "@/lib/api/server";
import type { PipelineGroup } from "@/lib/api/types";
import { GroupsClient } from "./GroupsClient";

export default async function GroupsPage() {
  let initialData: PipelineGroup[] | undefined;
  try {
    initialData = await serverFetch<PipelineGroup[]>("/pipeline-groups", {
      revalidate: 30,
    });
  } catch {
    // Backend unreachable / unauthenticated: client will fetch via React Query.
  }
  return <GroupsClient initialData={initialData} />;
}
