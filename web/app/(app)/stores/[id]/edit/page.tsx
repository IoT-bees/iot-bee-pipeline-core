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

  let configForForm: StoreInput["config"];
  if (data.storeType === "INFLUX_DB") {
    const c = data.config as {
      url?: string;
      data_base?: string;
      measurement?: string;
      token?: string;
      tag_fields?: string[];
    };
    configForForm = {
      persistenceType: "INFLUX_DB",
      url: c.url ?? "",
      data_base: c.data_base ?? "",
      measurement: c.measurement ?? "",
      token: c.token ?? "",
      tag_fields: (c.tag_fields ?? []).join(", "),
    };
  } else {
    const c = data.config as { log_name?: string };
    configForForm = {
      persistenceType: "LOCAL_LOG",
      log_name: c.log_name ?? "",
    };
  }

  return (
    <div>
      <h1 className="t-title mb-1">edit · {data.name}</h1>
      <DataStoreForm
        defaultValues={{
          name: data.name,
          description: data.dataStoreDescription,
          config: configForForm,
        }}
        submitLabel="✓ SAVE"
        submitting={update.isPending}
        onSubmit={async (payload) => {
          await update.mutateAsync(payload);
          router.push("/stores");
        }}
      />
    </div>
  );
}
