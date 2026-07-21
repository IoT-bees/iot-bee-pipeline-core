import type { CanvasMeta, CanvasState, ResourceType, SlotKind, SlotState } from "./types";

export type CanvasAction =
  | { type: "drop"; slotKind: SlotKind; resourceType: ResourceType }
  | { type: "openConfig"; slotKind: SlotKind }
  | { type: "fill"; slotKind: SlotKind; resourceId: number; name: string; summary: string }
  | { type: "edit"; slotKind: SlotKind }
  | { type: "clear"; slotKind: SlotKind }
  | { type: "closePanel" }
  | { type: "setMeta"; patch: Partial<CanvasMeta> }
  | { type: "arm"; slotKind: SlotKind; resourceType: ResourceType }
  | { type: "disarm" };

function setSlot(state: CanvasState, kind: SlotKind, next: SlotState): CanvasState {
  return { ...state, slots: { ...state.slots, [kind]: next } };
}

export function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case "drop":
      return {
        ...setSlot(state, action.slotKind, { kind: "configuring", resourceType: action.resourceType }),
        configuring: action.slotKind,
        armed: null,
      };
    case "openConfig":
      return { ...state, configuring: action.slotKind };
    case "fill":
      return {
        ...setSlot(state, action.slotKind, {
          kind: "filled",
          resourceId: action.resourceId,
          name: action.name,
          summary: action.summary,
        }),
        configuring: null,
      };
    case "edit": {
      const cur = state.slots[action.slotKind];
      const next: SlotState = cur.kind === "filled"
        ? {
            kind: "configuring",
            preselectId: cur.resourceId,
            previous: {
              resourceId: cur.resourceId,
              name: cur.name,
              summary: cur.summary,
            },
          }
        : { kind: "configuring" };
      return {
        ...setSlot(state, action.slotKind, next),
        configuring: action.slotKind,
      };
    }
    case "clear":
      return {
        ...setSlot(state, action.slotKind, { kind: "empty" }),
        configuring: state.configuring === action.slotKind ? null : state.configuring,
      };
    case "closePanel": {
      const cur = state.configuring;
      if (!cur) return { ...state, configuring: null };
      const slot = state.slots[cur];
      const reverted: SlotState = slot.kind === "configuring" && slot.previous
        ? { kind: "filled", ...slot.previous }
        : slot.kind === "configuring"
          ? { kind: "empty" }
          : slot;
      return { ...setSlot(state, cur, reverted), configuring: null };
    }
    case "setMeta":
      return { ...state, meta: { ...state.meta, ...action.patch } };
    case "arm":
      return { ...state, armed: { slotKind: action.slotKind, resourceType: action.resourceType } };
    case "disarm":
      return { ...state, armed: null };
  }
}

export function deployReady(state: CanvasState): boolean {
  return (
    state.slots.source.kind === "filled" &&
    state.slots.schema.kind === "filled" &&
    state.slots.store.kind === "filled" &&
    state.meta.name.trim().length > 0 &&
    state.meta.name.trim().length <= 30 &&
    state.meta.replicas >= 1 &&
    state.meta.replicas <= 64
  );
}

export function deployBlockedReason(state: CanvasState): string | null {
  if (state.slots.source.kind !== "filled") return "Falta seleccionar una conexión";
  if (state.slots.schema.kind !== "filled") return "Falta seleccionar un esquema";
  if (state.slots.store.kind !== "filled") return "Falta seleccionar un destino";
  if (state.meta.name.trim().length === 0) return "Escribe un nombre para el proyecto";
  if (state.meta.name.trim().length > 30) return "El nombre debe tener 30 caracteres o menos";
  if (state.meta.replicas < 1) return "Debe haber al menos una réplica";
  if (state.meta.replicas > 64) return "Se permiten hasta 64 réplicas";
  return null;
}
