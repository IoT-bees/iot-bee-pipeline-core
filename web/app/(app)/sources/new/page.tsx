"use client";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { DataSourceForm } from "@/components/forms/DataSourceForm";
import { useCreateSource } from "@/lib/hooks/useSources";

export default function NewSourcePage() {
  const router = useRouter();
  const create = useCreateSource();
  return (
    <div>
      <h1 className="t-title mb-1">Nuevo broker</h1>
      <p className="t-mono mb-6">Donde la instalación del cliente publica su telemetría.</p>
      <DataSourceForm
        showRequiredHint={false}
        showActionSeparator
        submitLabel={<><Plus size={16} aria-hidden="true" /> Crear broker</>}
        submitting={create.isPending}
        submitError={create.error instanceof Error ? create.error.message : null}
        onSubmit={async (payload) => {
          await create.mutateAsync(payload);
          router.push("/sources");
        }}
      />
    </div>
  );
}
