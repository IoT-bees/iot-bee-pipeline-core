"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { SchemaBuilder } from "@/components/forms/SchemaBuilder";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PipelineLockBanner } from "@/components/ui/PipelineLockBanner";
import { RowSkeleton } from "@/components/ui/RowSkeleton";
import { useSchema, useUpdateSchema } from "@/lib/hooks/useSchemas";
import { useBlockingPipelines } from "@/lib/hooks/useBlockedEntities";

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
  const { pipelines: blocking } = useBlockingPipelines("schema", numericId);
  if (isLoading || !data) return <RowSkeleton variant="panel" />;
  return (
    <div>
      <Breadcrumbs
        trail={[
          { label: "schemas", href: "/schemas" },
          { label: data.name, href: `/schemas/${id}` },
          { label: "edit" },
        ]}
      />
      <h1 className="t-title mb-1">edit · {data.name}</h1>
      <p className="t-mono mb-6">
        {"// "}name updates require a separate endpoint; this form only updates fields.
      </p>
      <PipelineLockBanner
        pipelines={blocking}
        action="edit"
        resourceLabel="validation schema"
      />
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
