"use client";
import { useRouter } from "next/navigation";
import { DataStoreForm } from "@/components/forms/DataStoreForm";
import { useCreateStore } from "@/lib/hooks/useStores";

export default function NewStorePage() {
  const router = useRouter();
  const create = useCreateStore();
  return (
    <div>
      <h1 className="t-title mb-1">new data store</h1>
      <p className="t-mono mb-6">{"// "}where processed pipeline data lands.</p>
      <DataStoreForm
        submitLabel="+ CREATE STORE"
        submitting={create.isPending}
        onSubmit={async (payload) => {
          await create.mutateAsync(payload);
          router.push("/stores");
        }}
      />
    </div>
  );
}
