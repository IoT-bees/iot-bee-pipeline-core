"use client";
import { useRouter } from "next/navigation";
import { DataSourceForm } from "@/components/forms/DataSourceForm";
import { useCreateSource } from "@/lib/hooks/useSources";
import type { SourceInput } from "@/lib/schemas/source";

export default function NewSourcePage() {
  const router = useRouter();
  const create = useCreateSource();
  return (
    <div>
      <h1 className="t-title mb-1">new data source</h1>
      <p className="t-mono mb-6">{"// "}step 1 of any pipeline.</p>
      <DataSourceForm
        defaultValues={
          {
            sourceType: "RABBIT_MQ",
            config: { host: "", queue: "" },
          } as Partial<SourceInput>
        }
        submitLabel="+ CREATE SOURCE"
        submitting={create.isPending}
        onSubmit={async (values) => {
          await create.mutateAsync(values);
          router.push("/sources");
        }}
      />
    </div>
  );
}
