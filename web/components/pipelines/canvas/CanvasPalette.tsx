"use client";

import { CanvasPaletteItem } from "./CanvasPaletteItem";
import type { CanvasState, ResourceType, SlotKind } from "./types";

interface Props {
  armed: CanvasState["armed"];
  onArmToggle: (slotKind: SlotKind, resourceType: ResourceType) => void;
}

const SOURCES: ReadonlyArray<{ rt: ResourceType; label: string }> = [
  { rt: "MQTT", label: "mqtt" },
  { rt: "RABBIT_MQ", label: "rabbitmq" },
  { rt: "KAFKA", label: "kafka" },
];
const SCHEMAS: ReadonlyArray<{ rt: ResourceType; label: string }> = [
  { rt: "NEW_SCHEMA", label: "nuevo esquema" },
];
const STORES: ReadonlyArray<{ rt: ResourceType; label: string }> = [
  { rt: "WEBHOOK", label: "webhook" },
  { rt: "INFLUX_DB", label: "influx db" },
  { rt: "LOCAL_LOG", label: "local log" },
];

function isArmed(armed: CanvasState["armed"], slotKind: SlotKind, rt: ResourceType): boolean {
  return armed?.slotKind === slotKind && armed.resourceType === rt;
}

export function CanvasPalette({ armed, onArmToggle }: Props) {
  return (
    <aside aria-label="Bloques para añadir al flujo" className="bg-[var(--color-bg-base)] border-b lg:border-b-0 lg:border-r border-[var(--color-border-subtle)] p-4 flex flex-col gap-4">
      <h2 className="text-[12px] font-semibold text-[var(--color-fg-2)]">Bloques</h2>
      <Section title="Conexiones">
        {SOURCES.map((s) => (
          <CanvasPaletteItem
            key={s.rt}
            slotKind="source"
            resourceType={s.rt}
            label={s.label}
            armed={isArmed(armed, "source", s.rt)}
            onArmToggle={() => onArmToggle("source", s.rt)}
          />
        ))}
      </Section>
      <Section title="Esquemas">
        {SCHEMAS.map((s) => (
          <CanvasPaletteItem
            key={s.rt}
            slotKind="schema"
            resourceType={s.rt}
            label={s.label}
            armed={isArmed(armed, "schema", s.rt)}
            onArmToggle={() => onArmToggle("schema", s.rt)}
          />
        ))}
      </Section>
      <Section title="Destinos">
        {STORES.map((s) => (
          <CanvasPaletteItem
            key={s.rt}
            slotKind="store"
            resourceType={s.rt}
            label={s.label}
            armed={isArmed(armed, "store", s.rt)}
            onArmToggle={() => onArmToggle("store", s.rt)}
          />
        ))}
      </Section>
      <p className="text-[10px] leading-4 text-[var(--color-fg-4)] pt-3 border-t border-dashed border-[var(--color-border-subtle)] mt-auto">
        Arrastra un bloque o selecciónalo para añadirlo.
      </p>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] uppercase font-semibold text-[var(--color-accent-strong)] mb-2">{title}</h3>
      <div className="flex flex-wrap lg:flex-col gap-2">{children}</div>
    </div>
  );
}
