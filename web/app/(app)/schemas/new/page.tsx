"use client";
import { useRouter } from "next/navigation";
import { SchemaBuilder } from "@/components/forms/SchemaBuilder";
import { useCreateSchema } from "@/lib/hooks/useSchemas";

export default function NewSchemaPage() {
  const router = useRouter();
  const create = useCreateSchema();
  return (
    <div>
      <h1 className="t-title mb-1">new validation schema</h1>
      <p className="t-mono mb-6">{"// "}define fields and transforms.</p>
      <SchemaBuilder
        submitLabel="+ CREATE SCHEMA"
        submitting={create.isPending}
        onSubmit={async (values) => {
          await create.mutateAsync(values);
          router.push("/schemas");
        }}
      />
    </div>
  );
}
