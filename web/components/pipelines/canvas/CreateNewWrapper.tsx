"use client";

import { DataSourceForm } from "@/components/forms/DataSourceForm";
import { DataStoreForm } from "@/components/forms/DataStoreForm";
import { SchemaBuilder } from "@/components/forms/SchemaBuilder";
import { useCreateSource } from "@/lib/hooks/useSources";
import { useCreateStore } from "@/lib/hooks/useStores";
import { useCreateSchema } from "@/lib/hooks/useSchemas";
import { sourcesApi } from "@/lib/api/endpoints/sources";
import { storesApi } from "@/lib/api/endpoints/stores";
import { schemasApi } from "@/lib/api/endpoints/schemas";
import { useToasts } from "@/lib/store/useToasts";
import type { SourceInput } from "@/lib/schemas/source";
import type { StoreInput } from "@/lib/schemas/store";
import type { SamplePipelineConfig } from "@/app/(app)/pipelines/new/samples";
import type { ResourceType, SlotKind } from "./types";

interface Props {
  slotKind: SlotKind;
  resourceType: ResourceType | undefined;
  template?: SamplePipelineConfig;
  onSaved: (id: number, name: string, summary: string) => void;
  onCancel: () => void;
}

function defaultSourceValues(
  rt: ResourceType | undefined,
  template: SamplePipelineConfig | undefined,
): Partial<SourceInput> {
  if (template && (!rt || template.source.config.sourceType === rt)) {
    return template.source;
  }
  if (rt === "MQTT") {
    return {
      name: "",
      description: "",
      config: { sourceType: "MQTT", broker_url: "", topic: "", client_id: "" },
    };
  }
  if (rt === "KAFKA") {
    return {
      name: "",
      description: "",
      config: { sourceType: "KAFKA", brokers: "", topic: "", group_id: "" },
    };
  }
  return {
    name: "",
    description: "",
    config: { sourceType: "RABBIT_MQ", url: "", queue_name: "", consumer_name: "" },
  };
}

function defaultStoreValues(
  rt: ResourceType | undefined,
  template: SamplePipelineConfig | undefined,
): Partial<StoreInput> {
  if (template && (!rt || template.store.config.persistenceType === rt)) {
    return template.store;
  }
  if (rt === "INFLUX_DB") {
    return {
      name: "",
      description: "",
      config: { persistenceType: "INFLUX_DB", url: "", data_base: "", measurement: "", token: "", tag_fields: "" },
    };
  }
  if (rt === "WEBHOOK") {
    return {
      name: "",
      description: "",
      config: { persistenceType: "WEBHOOK", url: "", bearer_token: "" },
    };
  }
  return {
    name: "",
    description: "",
    config: { persistenceType: "LOCAL_LOG", log_name: "telemetria" },
  };
}

export function CreateNewWrapper({ slotKind, resourceType, template, onSaved, onCancel }: Props) {
  const push = useToasts((s) => s.push);
  const createSource = useCreateSource();
  const createStore = useCreateStore();
  const createSchema = useCreateSchema();

  if (slotKind === "source") {
    return (
      <DataSourceForm
        defaultValues={defaultSourceValues(resourceType, template)}
        submitLabel={createSource.isPending ? "Guardando..." : "Guardar conexión"}
        submitting={createSource.isPending}
        onCancel={onCancel}
        onSubmit={async (payload) => {
          try {
            await createSource.mutateAsync(payload);
          } catch {
            return;
          }
          const fresh = await sourcesApi.list();
          const match = fresh.find((s) => s.name === payload.name);
          if (!match) {
            push({ kind: "error", message: "La conexión se guardó, pero no se pudo cargar." });
            return;
          }
          onSaved(
            match.id,
            match.name,
            `${match.sourceType.toLowerCase()} · ${match.dataSourceDescription || "Sin descripción"}`,
          );
        }}
      />
    );
  }

  if (slotKind === "schema") {
    return (
      <SchemaBuilder
        defaultName={template?.schemaName}
        defaultSchema={template?.schema}
        submitLabel={createSchema.isPending ? "Guardando..." : "Guardar esquema"}
        submitting={createSchema.isPending}
        onCancel={onCancel}
        onSubmit={async (payload) => {
          try {
            await createSchema.mutateAsync(payload);
          } catch {
            return;
          }
          const fresh = await schemasApi.list();
          const match = fresh.find((s) => s.name === payload.name);
          if (!match) {
            push({ kind: "error", message: "El esquema se guardó, pero no se pudo cargar." });
            return;
          }
          const fields = Object.keys(match.schema);
          onSaved(
            match.id,
            match.name,
            `${fields.length} campos · ${fields.slice(0, 3).join(", ")}${fields.length > 3 ? "…" : ""}`,
          );
        }}
      />
    );
  }

  if (slotKind === "store") {
    return (
      <DataStoreForm
        defaultValues={defaultStoreValues(resourceType, template)}
        submitLabel={createStore.isPending ? "Guardando..." : "Guardar destino"}
        submitting={createStore.isPending}
        onCancel={onCancel}
        onSubmit={async (payload) => {
          try {
            await createStore.mutateAsync(payload);
          } catch {
            return;
          }
          const fresh = await storesApi.list();
          const match = fresh.find((s) => s.name === payload.name);
          if (!match) {
            push({ kind: "error", message: "El destino se guardó, pero no se pudo cargar." });
            return;
          }
          onSaved(
            match.id,
            match.name,
            `${match.storeType.toLowerCase()} · ${match.dataStoreDescription || "Sin descripción"}`,
          );
        }}
      />
    );
  }

  return null;
}
