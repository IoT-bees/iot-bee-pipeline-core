"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { SchemaBuilder } from "@/components/forms/SchemaBuilder";
import { useSchema, useUpdateSchema } from "@/lib/hooks/useSchemas";

export default function EditSchemaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  const router = useRouter();
  const { data, isLoading } = useSchema(numericId);
  const update = useUpdateSchema(numericId);
  if (isLoading || !data) return <div className="t-mono">{"// "}loading…</div>;
  return (
    <div>
      <h1 className="t-title mb-1">edit · {data.name}</h1>
      <p className="t-mono mb-6">
        {"// "}name updates require a separate endpoint; this form only updates fields.
      </p>
      <SchemaBuilder
        defaultName={data.name}
        defaultSchema={data.schema}
        submitLabel="✓ SAVE"
        submitting={update.isPending}
        onSubmit={async (payload) => {
          await update.mutateAsync(payload);
          router.push("/schemas");
        }}
      />
    </div>
  );
}
