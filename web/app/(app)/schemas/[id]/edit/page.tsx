"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { SchemaBuilder } from "@/components/forms/SchemaBuilder";
import { PipelineLockBanner } from "@/components/ui/PipelineLockBanner";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
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
  const { data, isLoading, isError, error } = useSchema(numericId);
  const update = useUpdateSchema(numericId);
  const { pipelines: blocking } = useBlockingPipelines("schema", numericId);
  if (isLoading) return <HoneycombLoader label="Cargando definición" />;
  if (isError || !data) {
    return (
      <Panel tone="danger" className="max-w-[640px]">
        <h1 className="t-title">No pudimos abrir la definición</h1>
        <p className="mt-2 text-[14px] text-[var(--color-fg-2)]">{error instanceof Error ? error.message : "La definición no existe o ya no está disponible."}</p>
        <Button type="button" variant="ghost" className="mt-4" onClick={() => router.push("/schemas")}>Volver a reglas de datos</Button>
      </Panel>
    );
  }
  return (
    <div className="max-w-[1100px]">
      <h1 className="t-title mb-1">Editar · {data.name}</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-3)]">
        El nombre se conserva. Desde aquí puedes actualizar los campos y sus reglas.
      </p>
      {blocking.length > 0 && (
        <PipelineLockBanner
          pipelines={blocking}
          action="edit"
          resourceLabel="este esquema"
        />
      )}
      <SchemaBuilder
        defaultName={data.name}
        defaultSchema={data.schema}
        nameReadOnly
        disabled={blocking.length > 0}
        submitLabel="Guardar cambios"
        submitting={update.isPending}
        onSubmit={async (payload) => {
          await update.mutateAsync(payload);
          router.push("/schemas");
        }}
      />
    </div>
  );
}
