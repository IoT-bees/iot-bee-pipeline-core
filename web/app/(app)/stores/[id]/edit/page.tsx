"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { DataStoreForm } from "@/components/forms/DataStoreForm";
import { useStore, useUpdateStore } from "@/lib/hooks/useStores";
import type { StoreInput } from "@/lib/schemas/store";

export default function EditStorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  const router = useRouter();
  const { data, isLoading } = useStore(numericId);
  const update = useUpdateStore(numericId);
  if (isLoading || !data) return <div className="t-mono">{"// "}loading…</div>;
  return (
    <div>
      <h1 className="t-title mb-1">edit · {data.name}</h1>
      <DataStoreForm
        defaultValues={data as Partial<StoreInput>}
        submitLabel="✓ SAVE"
        submitting={update.isPending}
        onSubmit={async (values) => {
          await update.mutateAsync(values);
          router.push("/stores");
        }}
      />
    </div>
  );
}
