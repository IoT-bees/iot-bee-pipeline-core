"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { SchemaBuilder } from "@/components/forms/SchemaBuilder";
import { useSchema, useUpdateSchema } from "@/lib/hooks/useSchemas";
import type { BuilderInput } from "@/lib/schemas/validationSchema";

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
      <SchemaBuilder
        defaultValues={data as BuilderInput}
        submitLabel="✓ SAVE"
        submitting={update.isPending}
        onSubmit={async (v) => {
          await update.mutateAsync(v);
          router.push("/schemas");
        }}
      />
    </div>
  );
}
