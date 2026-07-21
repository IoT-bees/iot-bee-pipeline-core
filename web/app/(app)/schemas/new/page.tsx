"use client";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { SchemaBuilder } from "@/components/forms/SchemaBuilder";
import { useCreateSchema } from "@/lib/hooks/useSchemas";

export default function NewSchemaPage() {
  const router = useRouter();
  const create = useCreateSchema();
  return (
    <div>
      <h1 className="t-title mb-1">Nueva definición de datos</h1>
      <p className="t-mono mb-6">Define campos, validaciones y transformaciones reutilizables para la telemetría del cliente.</p>
      <SchemaBuilder
        submitLabel={<><Plus size={16} aria-hidden="true" /> Crear definición</>}
        submitting={create.isPending}
        onSubmit={async (payload) => {
          await create.mutateAsync(payload);
          router.push("/schemas");
        }}
      />
    </div>
  );
}
