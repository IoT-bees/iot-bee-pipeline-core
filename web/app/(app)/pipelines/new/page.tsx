"use client";
import { useRouter } from "next/navigation";
import { PipelineWizard } from "@/components/forms/PipelineWizard";
import { useSources } from "@/lib/hooks/useSources";
import { useStores } from "@/lib/hooks/useStores";
import { useSchemas } from "@/lib/hooks/useSchemas";
import { useGroups } from "@/lib/hooks/useGroups";
import { useCreatePipeline } from "@/lib/hooks/usePipelines";

export default function NewPipelinePage() {
  const router = useRouter();
  const sources = useSources();
  const stores = useStores();
  const schemas = useSchemas();
  const groups = useGroups();
  const create = useCreatePipeline();
  return (
    <div>
      <h1 className="t-title mb-1">new pipeline</h1>
      <p className="t-mono mb-6">{"// "}6 steps to a working pipeline.</p>
      <PipelineWizard
        sources={sources.data ?? []}
        stores={stores.data ?? []}
        schemas={schemas.data ?? []}
        groups={groups.data ?? []}
        submitting={create.isPending}
        onSubmit={async (payload) => {
          await create.mutateAsync(payload);
          router.push("/pipelines");
        }}
      />
    </div>
  );
}
