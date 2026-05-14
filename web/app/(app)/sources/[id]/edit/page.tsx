"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { DataSourceForm } from "@/components/forms/DataSourceForm";
import { useSource, useUpdateSource } from "@/lib/hooks/useSources";
import type { SourceInput } from "@/lib/schemas/source";

export default function EditSourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  const router = useRouter();
  const { data, isLoading } = useSource(numericId);
  const update = useUpdateSource(numericId);
  if (isLoading || !data) return <div className="t-mono">{"// "}loading…</div>;
  return (
    <div>
      <h1 className="t-title mb-1">edit · {data.name}</h1>
      <DataSourceForm
        defaultValues={data as Partial<SourceInput>}
        submitLabel="✓ SAVE"
        submitting={update.isPending}
        onSubmit={async (values) => {
          await update.mutateAsync(values);
          router.push("/sources");
        }}
      />
    </div>
  );
}
