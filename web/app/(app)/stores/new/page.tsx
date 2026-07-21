"use client";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { DataStoreForm } from "@/components/forms/DataStoreForm";
import { useCreateStore } from "@/lib/hooks/useStores";

export default function NewStorePage() {
  const router = useRouter();
  const create = useCreateStore();
  return (
    <div className="max-w-[640px]">
      <h1 className="t-title mb-1">Crear destino</h1>
      <p className="t-mono mb-6">Donde se entregan los datos validados.</p>
      <DataStoreForm
        showRequiredHint={false}
        submitLabel={<><Plus size={16} aria-hidden="true" /> Crear destino</>}
        submitting={create.isPending}
        onSubmit={async (payload) => {
          await create.mutateAsync(payload);
          router.push("/stores");
        }}
      />
    </div>
  );
}
