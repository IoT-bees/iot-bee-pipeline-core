"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { useToasts } from "@/lib/store/useToasts";
import { useSources } from "@/lib/hooks/useSources";
import { useSchemas } from "@/lib/hooks/useSchemas";
import { useStores } from "@/lib/hooks/useStores";
import { useCreatePipeline } from "@/lib/hooks/usePipelines";
import { useDefaultGroup } from "@/lib/hooks/useDefaultGroup";
import type { DataSource, DataStore, ValidationSchema } from "@/lib/api/types";
import {
  projectTemplates,
  sourceTypeForTemplate,
  type SamplePipelineConfig,
} from "@/app/(app)/pipelines/new/samples";
import { canvasReducer, deployBlockedReason } from "./canvasState";
import { CanvasPalette } from "./CanvasPalette";
import { CanvasSurface } from "./CanvasSurface";
import { ConfigPanel } from "./ConfigPanel";
import { CreateNewWrapper } from "./CreateNewWrapper";
import { DeployBar } from "./DeployBar";
import { PickExistingList, type ExistingItem } from "./PickExistingList";
import { emptyCanvasState, type CanvasState, type ResourceType, type SlotKind } from "./types";

function summarizeSource(s: DataSource): string {
  return `${s.sourceType.toLowerCase()} · ${s.dataSourceDescription || "Sin descripción"}`;
}
function summarizeSchema(s: ValidationSchema): string {
  const fields = Object.keys(s.schema);
  return `${fields.length} campos · ${fields.slice(0, 3).join(", ")}${fields.length > 3 ? "…" : ""}`;
}
function summarizeStore(s: DataStore): string {
  return `${s.storeType.toLowerCase()} · ${s.dataStoreDescription || "Sin descripción"}`;
}

function slotLabel(slotKind: SlotKind): "conexión" | "esquema" | "destino" {
  if (slotKind === "source") return "conexión";
  if (slotKind === "schema") return "esquema";
  return "destino";
}

function existingItemsFor(
  slotKind: SlotKind,
  state: CanvasState,
  sources: DataSource[] | undefined,
  schemas: ValidationSchema[] | undefined,
  stores: DataStore[] | undefined,
): ExistingItem[] {
  const cur = state.slots[slotKind];
  const armedType: ResourceType | undefined =
    cur.kind === "configuring" ? cur.resourceType : undefined;

  if (slotKind === "source") {
    const list = sources ?? [];
    const filtered = armedType ? list.filter((s) => s.sourceType === armedType) : list;
    return filtered.map((s) => ({ id: s.id, name: s.name, summary: summarizeSource(s) }));
  }
  if (slotKind === "schema") {
    return (schemas ?? []).map((s) => ({ id: s.id, name: s.name, summary: summarizeSchema(s) }));
  }
  const list = stores ?? [];
  const filtered = armedType ? list.filter((s) => s.storeType === armedType) : list;
  return filtered.map((s) => ({ id: s.id, name: s.name, summary: summarizeStore(s) }));
}

function isDirty(state: CanvasState): boolean {
  return (
    state.slots.source.kind !== "empty" ||
    state.slots.schema.kind !== "empty" ||
    state.slots.store.kind !== "empty" ||
    state.meta.name.length > 0
  );
}

export function CanvasClient() {
  const [state, dispatch] = useReducer(canvasReducer, emptyCanvasState);
  const [selectedTemplate, setSelectedTemplate] = useState<SamplePipelineConfig | undefined>();
  const push = useToasts((s) => s.push);
  const sourcesQ = useSources();
  const schemasQ = useSchemas();
  const storesQ = useStores();
  const router = useRouter();
  const createPipeline = useCreatePipeline();
  const { ensure: ensureDefaultGroup } = useDefaultGroup();

  const blockedReason = deployBlockedReason(state);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (state.armed) {
          dispatch({ type: "disarm" });
          return;
        }
        if (state.configuring) {
          dispatch({ type: "closePanel" });
          return;
        }
      }
      const isCmdEnter = (e.metaKey || e.ctrlKey) && e.key === "Enter";
      if (isCmdEnter && deployBlockedReason(state) === null) {
        e.preventDefault();
        const cta = document.querySelector<HTMLButtonElement>("[data-deploy-cta]");
        cta?.click();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state]);

  useEffect(() => {
    function onBefore(e: BeforeUnloadEvent) {
      if (!isDirty(state)) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [state]);

  async function handleSlotOpen(kind: SlotKind) {
    if (state.armed && state.armed.slotKind === kind && state.slots[kind].kind === "empty") {
      dispatch({ type: "drop", slotKind: kind, resourceType: state.armed.resourceType });
      return;
    }
    if (state.slots[kind].kind === "empty" && state.armed) {
      push({ kind: "error", message: `Este componente no corresponde al espacio de ${slotLabel(kind)}.` });
      return;
    }
    if (state.slots[kind].kind === "empty") {
      dispatch({ type: "openConfig", slotKind: kind });
      return;
    }
    dispatch({ type: "edit", slotKind: kind });
  }

  async function deploy() {
    const src = state.slots.source;
    const sch = state.slots.schema;
    const sto = state.slots.store;
    if (src.kind !== "filled" || sch.kind !== "filled" || sto.kind !== "filled") return;
    let group;
    try {
      group = await ensureDefaultGroup();
    } catch (e) {
      push({ kind: "error", message: e instanceof Error ? e.message : "No se pudo preparar el grupo predeterminado." });
      return;
    }
    try {
      await createPipeline.mutateAsync({
        name: state.meta.name.trim(),
        dataSourceId: src.resourceId,
        validationSchemaId: sch.resourceId,
        dataStoreId: sto.resourceId,
        pipelineGroupId: group.id,
        dataStoreDescription: "Creado desde el editor visual",
        pipelineReplication: state.meta.replicas,
      });
    } catch {
      return;
    }
    router.push("/pipelines");
    router.refresh();
  }

  function loadTemplate(template: SamplePipelineConfig) {
    setSelectedTemplate(template);
    dispatch({ type: "clear", slotKind: "source" });
    dispatch({ type: "clear", slotKind: "schema" });
    dispatch({ type: "clear", slotKind: "store" });
    dispatch({
      type: "setMeta",
      patch: {
        name: template.pipeline.name,
        replicas: template.pipeline.replication,
      },
    });
    dispatch({
      type: "drop",
      slotKind: "source",
      resourceType: sourceTypeForTemplate(template),
    });
    push({
      kind: "info",
      message: `Demo cargada. Guarda la conexión, el esquema y el destino; después crea el proyecto e inícialo desde la lista para ver mensajes reales.`,
    });
  }

  return (
    <div className="flex flex-col gap-0 -mx-4 md:-mx-6">
      <Breadcrumbs trail={[{ label: "Proyectos", href: "/pipelines" }, { label: "Nuevo proyecto" }]} />
      <div className="px-4 md:px-6 py-3.5 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] flex items-center justify-between gap-3">
        <h1 className="text-[18px] font-semibold text-[var(--color-fg-0)]">Nuevo proyecto</h1>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/pipelines")}>
            <ArrowLeft size={15} />
            Volver
          </Button>
          <ProjectTemplateMenu selectedId={selectedTemplate?.id} onSelect={loadTemplate} />
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only" data-testid="canvas-live">
        {state.configuring ? `Configurando ${slotLabel(state.configuring)}` : ""}
      </div>

      <div className="grid lg:grid-cols-[216px_minmax(0,1fr)]">
        <CanvasPalette
          armed={state.armed}
          onArmToggle={(slotKind, rt) =>
            state.armed?.slotKind === slotKind && state.armed.resourceType === rt
              ? dispatch({ type: "disarm" })
              : dispatch({ type: "arm", slotKind, resourceType: rt })
          }
        />
        <div className="min-w-0 overflow-x-auto lg:flex">
          <CanvasSurface
            state={state}
            onSlotDrop={(kind, rt) => dispatch({ type: "drop", slotKind: kind, resourceType: rt as never })}
            onSlotOpen={handleSlotOpen}
            onSlotClear={(kind) => dispatch({ type: "clear", slotKind: kind })}
            onWrongKindDrop={(from, to) =>
              push({
                kind: "error",
                message: `El componente de ${slotLabel(from)} no corresponde al espacio de ${slotLabel(to)}.`,
              })
            }
          />
        </div>
      </div>

      {state.configuring && (() => {
        const slotKind = state.configuring;
        const existing = existingItemsFor(slotKind, state, sourcesQ.data, schemasQ.data, storesQ.data);
        const cur = state.slots[slotKind];
        const preselect = cur.kind === "configuring" ? cur.preselectId : undefined;
        return (
          <ConfigPanel
            slotKind={slotKind}
            slotState={cur}
            existingCount={existing.length}
            onClose={() => dispatch({ type: "closePanel" })}
            renderExistingTab={() => (
              <ExistingTabBody
                slotKind={slotKind}
                items={existing}
                preselectId={preselect}
                onUse={(id, name, summary) =>
                  dispatch({ type: "fill", slotKind, resourceId: id, name, summary })
                }
              />
            )}
            renderNewTab={() => (
              <CreateNewWrapper
                key={`${selectedTemplate?.id ?? "blank"}-${slotKind}-${
                  cur.kind === "configuring" ? cur.resourceType ?? "existing" : "filled"
                }`}
                slotKind={slotKind}
                resourceType={cur.kind === "configuring" ? cur.resourceType : undefined}
                template={selectedTemplate}
                onSaved={(id, name, summary) =>
                  dispatch({ type: "fill", slotKind, resourceId: id, name, summary })
                }
                onCancel={() => dispatch({ type: "closePanel" })}
              />
            )}
          />
        );
      })()}

      <DeployBar
        name={state.meta.name}
        replicas={state.meta.replicas}
        blockedReason={blockedReason}
        onNameChange={(v) => dispatch({ type: "setMeta", patch: { name: v } })}
        onReplicasChange={(v) => dispatch({ type: "setMeta", patch: { replicas: v } })}
        deploying={createPipeline.isPending}
        onDeploy={deploy}
      />
    </div>
  );
}

function ProjectTemplateMenu({
  selectedId,
  onSelect,
}: {
  selectedId: string | undefined;
  onSelect: (template: SamplePipelineConfig) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onDocumentClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex min-h-9 items-center gap-2 rounded-[3px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 text-[12px] text-[var(--color-fg-2)] transition-colors hover:border-[var(--color-accent)]"
      >
        {selectedId ? "Demo aplicada" : "Cargar demo"}
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={`text-[var(--color-fg-4)] transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label="Plantillas de demo"
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-[min(330px,calc(100vw-32px))] rounded-[3px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-2 shadow-xl"
        >
          <p className="px-2 py-1.5 text-[11px] leading-4 text-[var(--color-fg-4)]">Crea una conexión, un esquema y un destino preparados para los servicios locales de demo.</p>
          {projectTemplates.map((template) => {
            const selected = selectedId === template.id;
            return (
              <button
                key={template.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  onSelect(template);
                  setIsOpen(false);
                }}
                aria-pressed={selected}
                className={`w-full rounded-[3px] text-left px-3 py-2.5 transition-colors ${
                  selected
                    ? "bg-[rgba(255,179,0,0.10)] text-[var(--color-accent-strong)]"
                    : "hover:bg-[var(--color-bg-elev)]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] font-semibold text-[var(--color-fg-1)]">{template.title}</span>
                  <span className="text-[10px] text-[var(--color-fg-4)]">{template.vertical}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExistingTabBody({
  slotKind,
  items,
  preselectId,
  onUse,
}: {
  slotKind: SlotKind;
  items: ExistingItem[];
  preselectId: number | undefined;
  onUse: (id: number, name: string, summary: string) => void;
}) {
  const [selected, setSelected] = useState<number | undefined>(preselectId);
  return (
    <div className="flex flex-col gap-3">
      <PickExistingList items={items} preselectId={selected} onSelect={setSelected} />
      <div className="flex gap-2 pt-2 border-t border-[var(--color-bg-elev)]">
        <button
          type="button"
          disabled={selected === undefined}
          onClick={() => {
            const it = items.find((x) => x.id === selected);
            if (it) onUse(it.id, it.name, it.summary);
          }}
          className="px-3 py-1.5 text-[10px] tracking-[1.5px] uppercase font-bold bg-[var(--color-accent)] text-[var(--color-bg-base)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Usar {slotLabel(slotKind)}
        </button>
      </div>
    </div>
  );
}
