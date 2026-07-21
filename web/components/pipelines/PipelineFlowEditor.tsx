"use client";

import { useEffect, useReducer, useState } from "react";
import type {
  DataSource,
  DataStore,
  FlowStageTelemetry,
  Pipeline,
  ReplicaStatus,
  ValidationSchema,
} from "@/lib/api/types";
import { summarizeFlowTelemetry } from "@/lib/flowTelemetry";
import { useToasts } from "@/lib/store/useToasts";
import { canStop } from "@/lib/status";
import {
  useUpdatePipelineSchema,
  useUpdatePipelineSource,
  useUpdatePipelineStore,
} from "@/lib/hooks/usePipelines";
import { useSchemas } from "@/lib/hooks/useSchemas";
import { useSources } from "@/lib/hooks/useSources";
import { useStores } from "@/lib/hooks/useStores";
import { canvasReducer } from "./canvas/canvasState";
import { CanvasSurface } from "./canvas/CanvasSurface";
import { ConfigPanel } from "./canvas/ConfigPanel";
import { PickExistingList, type ExistingItem } from "./canvas/PickExistingList";
import { PipelineResourceDetailsModal } from "./PipelineResourceDetailsModal";
import type { CanvasState, SlotKind } from "./canvas/types";
import { BeeIcon } from "@/components/ui/icons/BeeIcon";

function summarizeSource(source: DataSource): string {
  return `${source.sourceType.toLowerCase()} · ${source.dataSourceDescription || "Sin descripción"}`;
}

function summarizeSchema(schema: ValidationSchema): string {
  const fields = Object.keys(schema.schema);
  return `${fields.length} campos · ${fields.slice(0, 3).join(", ")}${fields.length > 3 ? "…" : ""}`;
}

function summarizeStore(store: DataStore): string {
  return `${store.storeType.toLowerCase()} · ${store.dataStoreDescription || "Sin descripción"}`;
}

function initialState(pipeline: Pipeline): CanvasState {
  return {
    slots: {
      source: {
        kind: "filled",
        resourceId: pipeline.dataSource.id,
        name: pipeline.dataSource.name,
        summary: pipeline.dataSource.sourceType?.toLowerCase() ?? "Broker configurado",
      },
      schema: {
        kind: "filled",
        resourceId: pipeline.dataValidationSchema.id,
        name: pipeline.dataValidationSchema.name,
        summary: "Definición de reglas de datos",
      },
      store: {
        kind: "filled",
        resourceId: pipeline.dataStore.id,
        name: pipeline.dataStore.name,
        summary: pipeline.dataStore.storeType?.toLowerCase() ?? "Destino configurado",
      },
    },
    meta: {
      name: pipeline.name,
      replicas: pipeline.replicationFactor,
      groupId: pipeline.pipelineGroup.id,
    },
    configuring: null,
    drag: null,
    armed: null,
  };
}

function itemsFor(
  kind: SlotKind,
  sources: DataSource[] | undefined,
  schemas: ValidationSchema[] | undefined,
  stores: DataStore[] | undefined,
): ExistingItem[] {
  if (kind === "source") {
    return (sources ?? []).map((source) => ({
      id: source.id,
      name: source.name,
      summary: summarizeSource(source),
    }));
  }
  if (kind === "schema") {
    return (schemas ?? []).map((schema) => ({
      id: schema.id,
      name: schema.name,
      summary: summarizeSchema(schema),
    }));
  }
  return (stores ?? []).map((store) => ({
    id: store.id,
    name: store.name,
    summary: summarizeStore(store),
  }));
}

export function PipelineFlowEditor({
  pipeline,
  pipelineStatus,
  replicas,
  telemetryPending = false,
  telemetryUnavailable = false,
}: {
  pipeline: Pipeline;
  pipelineStatus?: string;
  replicas: ReadonlyArray<ReplicaStatus>;
  telemetryPending?: boolean;
  telemetryUnavailable?: boolean;
}) {
  const [state, dispatch] = useReducer(canvasReducer, pipeline, initialState);
  const [inspecting, setInspecting] = useState<SlotKind | null>(null);
  const push = useToasts((store) => store.push);
  const sources = useSources();
  const schemas = useSchemas();
  const stores = useStores();
  const updateSource = useUpdatePipelineSource(pipeline.id);
  const updateSchema = useUpdatePipelineSchema(pipeline.id);
  const updateStore = useUpdatePipelineStore(pipeline.id);
  const locked = canStop(pipelineStatus);
  const configuring = state.configuring;
  const saving = updateSource.isPending || updateSchema.isPending || updateStore.isPending;

  function openSlot(kind: SlotKind) {
    if (locked) {
      push({ kind: "error", message: "Detén el proyecto antes de cambiar los recursos del flujo." });
      return;
    }
    dispatch({ type: "edit", slotKind: kind });
  }

  async function selectResource(id: number, name: string, summary: string) {
    if (!configuring) return;
    const current = state.slots[configuring];
    if (current.kind === "filled" && current.resourceId === id) {
      dispatch({ type: "fill", slotKind: configuring, resourceId: id, name, summary });
      return;
    }

    try {
      if (configuring === "source") await updateSource.mutateAsync(id);
      if (configuring === "schema") await updateSchema.mutateAsync(id);
      if (configuring === "store") await updateStore.mutateAsync(id);
      dispatch({ type: "fill", slotKind: configuring, resourceId: id, name, summary });
    } catch {
      // El mutation hook ya informa el error y el nodo conserva su recurso anterior.
    }
  }

  const existing = configuring
    ? itemsFor(configuring, sources.data, schemas.data, stores.data)
    : [];
  const currentSlot = configuring ? state.slots[configuring] : null;
  const inspectedSlot = inspecting ? state.slots[inspecting] : null;
  const inspectedResourceId = inspectedSlot?.kind === "filled" ? inspectedSlot.resourceId : undefined;

  return (
    <>
      <div className="overflow-hidden rounded-[6px] border border-[var(--color-border-strong)] shadow-sm">
        <CanvasSurface
          state={state}
          onSlotDrop={() => undefined}
          onSlotOpen={openSlot}
          onSlotInspect={setInspecting}
          onWrongKindDrop={() => undefined}
          compact
        />
      </div>
      <FlowActivity
        replicas={replicas}
        pending={telemetryPending}
        unavailable={telemetryUnavailable}
      />

      {configuring && currentSlot && (
        <ConfigPanel
          slotKind={configuring}
          slotState={currentSlot}
          existingCount={existing.length}
          onClose={() => dispatch({ type: "closePanel" })}
          renderExistingTab={() => (
            <ResourcePicker
              items={existing}
              preselectId={currentSlot.kind === "configuring" ? currentSlot.preselectId : undefined}
              saving={saving}
              onUse={selectResource}
            />
          )}
        />
      )}
      <PipelineResourceDetailsModal
        kind={inspecting}
        source={inspecting === "source" ? sources.data?.find((source) => source.id === inspectedResourceId) : undefined}
        schema={inspecting === "schema" ? schemas.data?.find((schema) => schema.id === inspectedResourceId) : undefined}
        store={inspecting === "store" ? stores.data?.find((store) => store.id === inspectedResourceId) : undefined}
        loading={
          inspecting === "source" ? sources.isLoading
            : inspecting === "schema" ? schemas.isLoading
              : inspecting === "store" ? stores.isLoading
                : false
        }
        onClose={() => setInspecting(null)}
      />
    </>
  );
}

function FlowActivity({
  replicas,
  pending,
  unavailable,
}: {
  replicas: ReadonlyArray<ReplicaStatus>;
  pending: boolean;
  unavailable: boolean;
}) {
  const { received, validated, rejected, delivered } = summarizeFlowTelemetry(replicas);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const validationRate = ratio(validated.count, received.count);
  const rejectionRate = ratio(rejected.count, received.count);
  const deliveryRate = ratio(delivered.count, validated.count);
  const totalDeliveryRate = ratio(delivered.count, received.count);

  useEffect(() => {
    setLastUpdatedAt(Date.now());
  }, [replicas]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-nav)] px-4 py-4 md:px-5" aria-live="polite">
      {(pending || unavailable) ? (
        <p className="text-[13px] text-[var(--color-fg-2)]" role="status" aria-live="polite">
          {unavailable ? "No podemos mostrar las métricas en este momento." : "Actualizando métricas operativas…"}
        </p>
      ) : (
      <>
      <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
        <ActivityStage
          label="Recibidos"
          description="El broker entregó mensajes al proyecto."
          telemetry={received}
          accent="var(--color-accent)"
          showBee
        />
        <FlowArrow active={received.count > 0 && validated.count > 0} />
        <ActivityStage
          label="Validados"
          description="El esquema aprobó mensajes para enviarlos."
          telemetry={validated}
          rate={{ value: validationRate, label: "de recibidos" }}
          rejected={{ count: rejected.count, rate: rejectionRate }}
          accent="var(--color-online)"
          showBee
        />
        <FlowArrow active={validated.count > 0 && delivered.count > 0} />
        <ActivityStage
          label="Entregados"
          description="El destino confirmó la persistencia."
          telemetry={delivered}
          accent="#66B3FF"
          showBee
          rate={{ value: deliveryRate, label: "de validados" }}
          secondaryRate={{ value: totalDeliveryRate, label: "del total recibido" }}
        />
      </div>
      <p className="mt-3 text-[12px] text-[var(--color-fg-3)]">
        Actualizado hace {formatRelativeTime(lastUpdatedAt, now)} · Métricas operativas cada 5 segundos.
      </p>
      </>
      )}
    </div>
  );
}

function ActivityStage({
  label,
  description,
  telemetry,
  rate,
  rejected,
  accent,
  showBee = false,
  secondaryRate,
}: {
  label: string;
  description: string;
  telemetry: FlowStageTelemetry;
  rate?: { value: number | null; label: string };
  rejected?: { count: number; rate: number | null };
  accent: string;
  showBee?: boolean;
  secondaryRate?: { value: number | null; label: string };
}) {
  return (
    <div
      className="rounded-[4px] border bg-[var(--color-bg-panel)] px-3 py-3"
      style={{ borderColor: accent }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase" style={{ color: accent }}>{label}</div>
        {showBee && (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center [clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0_50%)]"
            style={{ backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)` }}
          >
            <BeeIcon size={19} color={accent} />
          </span>
        )}
      </div>
      <div className="mt-1 text-[22px] font-bold leading-none text-[var(--color-fg-0)]">
        {new Intl.NumberFormat("es-CO").format(telemetry.count)}
      </div>
      {rate && (
        <p className="mt-1 text-[12px] font-semibold text-[var(--color-fg-2)]">
          {formatPercentage(rate.value)} {rate.label}
        </p>
      )}
      <p className="mt-2 text-[12px] leading-4 text-[var(--color-fg-3)]">{description}</p>
      {secondaryRate && (
        <p className="mt-2 text-[12px] text-[var(--color-fg-3)]">
          {formatPercentage(secondaryRate.value)} {secondaryRate.label}
        </p>
      )}
      {rejected && rejected.count > 0 && (
        <p className="mt-2 border-t border-[var(--color-border-subtle)] pt-2 text-[12px] text-[var(--color-danger)]">
          {new Intl.NumberFormat("es-CO").format(rejected.count)} rechazados · {formatPercentage(rejected.rate)} de recibidos
        </p>
      )}
    </div>
  );
}

function ratio(value: number, total: number): number | null {
  return total > 0 ? (value / total) * 100 : null;
}

function formatPercentage(value: number | null): string {
  return value === null
    ? "—"
    : `${value.toLocaleString("es-CO", { maximumFractionDigits: 1 })}%`;
}

function formatRelativeTime(time: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - time) / 1_000));
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)} min`;
  return `${Math.floor(seconds / 3_600)} h`;
}

function FlowArrow({ active }: { active: boolean }) {
  return (
    <div className={`hidden items-center text-[20px] md:flex ${active ? "text-[var(--color-online)]" : "text-[var(--color-border-strong)]"}`} aria-hidden="true">
      →
    </div>
  );
}

function ResourcePicker({
  items,
  preselectId,
  saving,
  onUse,
}: {
  items: ExistingItem[];
  preselectId: number | undefined;
  saving: boolean;
  onUse: (id: number, name: string, summary: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<number | undefined>(preselectId);
  const chosen = items.find((item) => item.id === selected);

  return (
    <div className="flex flex-col gap-3">
      <PickExistingList items={items} preselectId={selected} onSelect={setSelected} />
      <div className="flex gap-2 border-t border-[var(--color-border-subtle)] pt-3">
        <button
          type="button"
          disabled={!chosen || saving}
          onClick={() => chosen && void onUse(chosen.id, chosen.name, chosen.summary)}
          className="rounded-[3px] bg-[var(--color-accent)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[1.5px] text-[var(--landing-accent-ink)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Guardando..." : "Usar recurso"}
        </button>
      </div>
    </div>
  );
}
