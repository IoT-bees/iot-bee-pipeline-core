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

  let configForForm: SourceInput["config"];
  if (data.sourceType === "KAFKA") {
    const c = data.config as { brokers?: string[]; topic?: string; group_id?: string };
    configForForm = {
      sourceType: "KAFKA",
      brokers: (c.brokers ?? []).join(", "),
      topic: c.topic ?? "",
      group_id: c.group_id ?? "",
    };
  } else if (data.sourceType === "MQTT") {
    const c = data.config as { broker_url?: string; topic?: string; client_id?: string };
    configForForm = {
      sourceType: "MQTT",
      broker_url: c.broker_url ?? "",
      topic: c.topic ?? "",
      client_id: c.client_id ?? "",
    };
  } else {
    const c = data.config as { url?: string; queue_name?: string; consumer_name?: string };
    configForForm = {
      sourceType: "RABBIT_MQ",
      url: c.url ?? "",
      queue_name: c.queue_name ?? "",
      consumer_name: c.consumer_name ?? "",
    };
  }

  return (
    <div>
      <h1 className="t-title mb-1">edit · {data.name}</h1>
      <DataSourceForm
        defaultValues={{
          name: data.name,
          description: data.dataSourceDescription,
          config: configForForm,
        }}
        submitLabel="✓ SAVE"
        submitting={update.isPending}
        onSubmit={async (payload) => {
          await update.mutateAsync(payload);
          router.push("/sources");
        }}
      />
    </div>
  );
}
