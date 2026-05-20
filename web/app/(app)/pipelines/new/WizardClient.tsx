"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Panel } from "@/components/ui/Panel";
import { WizardSection } from "@/components/pipelines/WizardSection";
import { DataSourceForm } from "@/components/forms/DataSourceForm";
import { DataStoreForm } from "@/components/forms/DataStoreForm";
import { SchemaBuilder } from "@/components/forms/SchemaBuilder";
import { useCreateSource, useSources } from "@/lib/hooks/useSources";
import { useCreateStore, useStores } from "@/lib/hooks/useStores";
import { useCreateSchema, useSchemas } from "@/lib/hooks/useSchemas";
import { useCreatePipeline } from "@/lib/hooks/usePipelines";
import { useDefaultGroup } from "@/lib/hooks/useDefaultGroup";
import { useToasts } from "@/lib/store/useToasts";
import { sourcesApi } from "@/lib/api/endpoints/sources";
import { storesApi } from "@/lib/api/endpoints/stores";
import { schemasApi } from "@/lib/api/endpoints/schemas";
import type { SourceInput } from "@/lib/schemas/source";
import type { StoreInput } from "@/lib/schemas/store";
import type { SchemaMap } from "@/lib/api/types";
import { sampleMqttToInfluxConfig } from "./samples";

type Created = {
  sourceId?: number;
  storeId?: number;
  schemaId?: number;
};

interface SampleDefaults {
  source?: Partial<SourceInput>;
  store?: Partial<StoreInput>;
  schemaName?: string;
  schema?: SchemaMap;
  pipelineName?: string;
  replication?: number;
}

export function WizardClient() {
  const router = useRouter();
  const push = useToasts((s) => s.push);
  const { ensure: ensureDefaultGroup } = useDefaultGroup();

  const sourcesQ = useSources();
  const storesQ = useStores();
  const schemasQ = useSchemas();

  const createSource = useCreateSource();
  const createStore = useCreateStore();
  const createSchema = useCreateSchema();
  const createPipeline = useCreatePipeline();

  const [created, setCreated] = useState<Created>({});
  const [name, setName] = useState("");
  const [replication, setReplication] = useState(1);
  const [busy, setBusy] = useState(false);
  const [defaults, setDefaults] = useState<SampleDefaults>({});
  // bump these keys to force sub-form re-mount when LOAD SAMPLE injects defaults
  const [formKey, setFormKey] = useState(0);

  function loadSample() {
    const s = sampleMqttToInfluxConfig;
    setDefaults({
      source: s.source,
      store: s.store,
      schemaName: s.schemaName,
      schema: s.schema,
      pipelineName: s.pipeline.name,
      replication: s.pipeline.replication,
    });
    setName(s.pipeline.name);
    setReplication(s.pipeline.replication);
    setFormKey((k) => k + 1);
    push({ kind: "info", message: "sample loaded — review and submit each section" });
  }

  async function createAll() {
    setBusy(true);
    try {
      if (!created.sourceId) throw new Error("complete the SOURCE step");
      if (!created.schemaId) throw new Error("complete the SCHEMA step");
      if (!created.storeId) throw new Error("complete the STORE step");
      if (!name.trim()) throw new Error("pipeline NAME is required");

      const group = await ensureDefaultGroup();
      await createPipeline.mutateAsync({
        name,
        dataSourceId: created.sourceId,
        dataStoreId: created.storeId,
        validationSchemaId: created.schemaId,
        pipelineGroupId: group.id,
        dataStoreDescription: "created via onboarding wizard",
        pipelineReplication: replication,
      });
      router.push("/pipelines");
    } catch (e) {
      push({ kind: "error", message: e instanceof Error ? e.message : "unknown" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="t-title">create pipeline</h1>
          <p className="t-mono">
            {"// "}one page, four sections — your first pipeline in minutes.
          </p>
        </div>
        <Button variant="ghost" onClick={loadSample}>
          ↓ LOAD SAMPLE
        </Button>
      </div>

      <WizardSection
        step={1}
        title={
          created.sourceId
            ? "data source — created"
            : "data source — connect a broker"
        }
        status={created.sourceId ? "ready" : "pending"}
        defaultOpen
      >
        <DataSourceForm
          key={`source-${formKey}`}
          defaultValues={defaults.source}
          submitLabel={
            createSource.isPending ? "CREATING…" : "+ SAVE SOURCE"
          }
          submitting={createSource.isPending}
          onSubmit={async (payload) => {
            await createSource.mutateAsync(payload);
            const fresh = await sourcesApi.list();
            const match = fresh.find((s) => s.name === payload.name);
            if (!match) throw new Error("source was saved but could not be located");
            setCreated((c) => ({ ...c, sourceId: match.id }));
          }}
        />
      </WizardSection>

      <WizardSection
        step={2}
        title={
          created.schemaId
            ? "validation schema — created"
            : "validation schema — define the fields"
        }
        status={created.schemaId ? "ready" : "pending"}
        defaultOpen={Boolean(created.sourceId && !created.schemaId)}
      >
        <SchemaBuilder
          key={`schema-${formKey}`}
          defaultName={defaults.schemaName}
          defaultSchema={defaults.schema}
          submitLabel={
            createSchema.isPending ? "CREATING…" : "+ SAVE SCHEMA"
          }
          submitting={createSchema.isPending}
          onSubmit={async (payload) => {
            await createSchema.mutateAsync(payload);
            const fresh = await schemasApi.list();
            const match = fresh.find((s) => s.name === payload.name);
            if (!match) throw new Error("schema was saved but could not be located");
            setCreated((c) => ({ ...c, schemaId: match.id }));
          }}
        />
      </WizardSection>

      <WizardSection
        step={3}
        title={
          created.storeId
            ? "data store — created"
            : "data store — pick a destination"
        }
        status={created.storeId ? "ready" : "pending"}
        defaultOpen={Boolean(created.schemaId && !created.storeId)}
      >
        <DataStoreForm
          key={`store-${formKey}`}
          defaultValues={defaults.store}
          submitLabel={
            createStore.isPending ? "CREATING…" : "+ SAVE STORE"
          }
          submitting={createStore.isPending}
          onSubmit={async (payload) => {
            await createStore.mutateAsync(payload);
            const fresh = await storesApi.list();
            const match = fresh.find((s) => s.name === payload.name);
            if (!match) throw new Error("store was saved but could not be located");
            setCreated((c) => ({ ...c, storeId: match.id }));
          }}
        />
      </WizardSection>

      <WizardSection
        step={4}
        title="pipeline meta"
        status={
          name && created.sourceId && created.storeId && created.schemaId
            ? "ready"
            : "pending"
        }
        defaultOpen={Boolean(
          created.sourceId && created.storeId && created.schemaId,
        )}
      >
        <FormField label="NAME">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-iot-pipeline"
          />
        </FormField>
        <FormField
          label="REPLICATION FACTOR"
          hint="number of parallel processor replicas (1-64)"
        >
          <Input
            type="number"
            min={1}
            max={64}
            value={replication}
            onChange={(e) =>
              setReplication(Math.max(1, parseInt(e.target.value, 10) || 1))
            }
          />
        </FormField>
      </WizardSection>

      {(sourcesQ.isError || storesQ.isError || schemasQ.isError) && (
        <Panel tone="danger" className="mb-4">
          <div className="t-mono text-[var(--color-danger)]">
            {"// "}could not load existing resources — refresh to retry
          </div>
        </Panel>
      )}

      <div className="mt-6 flex gap-3 items-center flex-wrap">
        <Button
          variant="primary"
          disabled={
            busy ||
            !name ||
            !created.sourceId ||
            !created.storeId ||
            !created.schemaId
          }
          onClick={createAll}
        >
          {busy ? "CREATING…" : "+ CREATE PIPELINE"}
        </Button>
        <Button variant="ghost" onClick={() => router.push("/pipelines")}>
          CANCEL
        </Button>
        <span className="t-mono ml-auto">
          {[
            created.sourceId && "source",
            created.schemaId && "schema",
            created.storeId && "store",
          ]
            .filter(Boolean)
            .join(" · ") || "// no resources created yet"}
        </span>
      </div>
    </div>
  );
}
