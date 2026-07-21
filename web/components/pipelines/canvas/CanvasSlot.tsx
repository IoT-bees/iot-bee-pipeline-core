"use client";

import { Eye, Pencil, X } from "lucide-react";
import { decodePayload, matchesSlotKind } from "./dnd";
import type { SlotKind, SlotState } from "./types";

interface Props {
  kind: SlotKind;
  state: SlotState;
  onDrop: (payloadResourceType: string) => void;
  onWrongKind: (payloadSlotKind: SlotKind) => void;
  onOpen: () => void;
  onInspect?: () => void;
  onClear?: () => void;
  compact?: boolean;
}

const KIND_LABEL: Record<SlotKind, string> = {
  source: "Conexión",
  schema: "Esquema",
  store: "Destino",
};

const KIND_ACCENT: Record<SlotKind, string> = {
  source: "var(--color-accent)",
  schema: "var(--color-online)",
  store: "#66B3FF",
};

const KIND_HELP: Record<SlotKind, string> = {
  source: "Elige el broker o sistema que envía tus datos.",
  schema: "Define los campos que llegan y las reglas que deben cumplir.",
  store: "Selecciona dónde quedarán disponibles los datos procesados.",
};

const STEP: Record<SlotKind, number> = {
  source: 1,
  schema: 2,
  store: 3,
};

export function CanvasSlot({ kind, state, onDrop, onWrongKind, onOpen, onInspect, onClear, compact = false }: Props) {
  const label = KIND_LABEL[kind];
  const step = STEP[kind];

  function handleDragOver(e: React.DragEvent) {
    const payload = decodePayload(e.dataTransfer);
    if (payload && matchesSlotKind(payload, kind)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDrop(e: React.DragEvent) {
    const payload = decodePayload(e.dataTransfer);
    if (!payload) return;
    if (!matchesSlotKind(payload, kind)) {
      onWrongKind(payload.slotKind);
      return;
    }
    e.preventDefault();
    onDrop(payload.resourceType);
  }

  if (state.kind === "filled") {
    const accent = KIND_ACCENT[kind];
    return (
      <div
        className={`relative w-full rounded-[6px] border border-[var(--color-border-strong)] bg-[var(--color-bg-panel)] shadow-md ${
          compact ? "min-h-[128px] px-3 py-3" : "min-h-[168px] px-4 py-4 lg:min-h-[192px]"
        }`}
        style={{ borderColor: accent }}
      >
        <span className="text-[11px] font-semibold uppercase" style={{ color: accent }}>
          Paso {step} · {label} lista
        </span>
        <div className="mt-3 break-words pr-[68px] text-[14px] font-semibold text-[var(--color-fg-0)]">{state.name}</div>
        <div className="text-[11px] text-[var(--color-fg-4)] mt-1 leading-4">{state.summary}</div>
        <div className="absolute top-2 right-2 flex gap-1">
          {onInspect && (
            <button
              type="button"
              onClick={onInspect}
              className="grid h-7 w-7 place-items-center rounded-[3px] border border-[var(--color-border-subtle)] text-[var(--color-fg-3)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
              aria-label={`Ver detalles de ${label.toLowerCase()}`}
            >
              <Eye size={13} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={onOpen}
            className="grid h-7 w-7 place-items-center rounded-[3px] border border-[var(--color-border-subtle)] text-[var(--color-fg-3)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
            aria-label={`Editar ${label.toLowerCase()}`}
          >
            <Pencil size={13} aria-hidden="true" />
          </button>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="grid place-items-center h-7 w-7 rounded-[3px] border border-[var(--color-border-subtle)] text-[var(--color-fg-3)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)]"
              aria-label={`Quitar ${label.toLowerCase()}`}
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state.kind === "configuring") {
    return (
      <div
        className="w-full min-h-[168px] lg:min-h-[192px] flex flex-col items-center justify-center gap-2.5 px-5 rounded-[6px] bg-[rgba(255,179,0,0.04)] border border-[var(--color-accent)] text-[var(--color-fg-3)] text-[11px] text-center"
        aria-label={`Espacio de ${label.toLowerCase()} en configuración`}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[rgba(255,179,0,0.16)] text-[14px] font-bold text-[var(--color-accent-strong)]">
          {step}
        </span>
        <span className="font-semibold text-[var(--color-fg-1)]">Configurando {label.toLowerCase()}</span>
        <span className="max-w-[175px] leading-4">Completa los datos en la ventana de configuración</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex min-h-[168px] w-full flex-col items-center justify-center gap-3 rounded-[6px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-panel)] px-5 py-5 text-center shadow-md transition-colors hover:border-[var(--color-accent)] hover:bg-[rgba(255,179,0,0.08)] lg:min-h-[192px]"
      aria-label={`Espacio de ${label.toLowerCase()} vacío`}
    >
      <span className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] text-[15px] font-bold text-[var(--color-accent-strong)]">
        {step}
      </span>
      <span className="text-[13px] font-semibold text-[var(--color-fg-1)]">Añadir {label.toLowerCase()}</span>
      <span className="text-[11px] leading-4 text-[var(--color-fg-4)] max-w-[210px]">{KIND_HELP[kind]}</span>
      <span className="text-[11px] font-semibold text-[var(--color-accent-strong)]">Seleccionar o soltar aquí</span>
    </button>
  );
}
