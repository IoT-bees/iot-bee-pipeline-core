import { describe, expect, it } from "vitest";
import { canvasReducer, deployReady, deployBlockedReason } from "@/components/pipelines/canvas/canvasState";
import { emptyCanvasState, type CanvasState } from "@/components/pipelines/canvas/types";

describe("canvasReducer", () => {
  it("drop on empty slot transitions to configuring", () => {
    const next = canvasReducer(emptyCanvasState, {
      type: "drop",
      slotKind: "source",
      resourceType: "MQTT",
    });
    expect(next.slots.source).toEqual({ kind: "configuring", resourceType: "MQTT" });
    expect(next.configuring).toBe("source");
  });

  it("fill marks the slot as filled and closes the panel", () => {
    const state: CanvasState = {
      ...emptyCanvasState,
      slots: { ...emptyCanvasState.slots, source: { kind: "configuring", resourceType: "MQTT" } },
      configuring: "source",
    };
    const next = canvasReducer(state, {
      type: "fill",
      slotKind: "source",
      resourceId: 7,
      name: "mqtt-prod",
      summary: "topic: sensors/#",
    });
    expect(next.slots.source).toEqual({
      kind: "filled",
      resourceId: 7,
      name: "mqtt-prod",
      summary: "topic: sensors/#",
    });
    expect(next.configuring).toBeNull();
  });

  it("edit on a filled slot reopens configuring with the current id preselected", () => {
    const state: CanvasState = {
      ...emptyCanvasState,
      slots: { ...emptyCanvasState.slots, source: { kind: "filled", resourceId: 7, name: "mqtt-prod", summary: "x" } },
    };
    const next = canvasReducer(state, { type: "edit", slotKind: "source" });
    expect(next.slots.source).toEqual({
      kind: "configuring",
      preselectId: 7,
      previous: { resourceId: 7, name: "mqtt-prod", summary: "x" },
    });
    expect(next.configuring).toBe("source");
  });

  it("clear resets a filled slot to empty without touching others", () => {
    const state: CanvasState = {
      ...emptyCanvasState,
      slots: {
        ...emptyCanvasState.slots,
        source: { kind: "filled", resourceId: 7, name: "mqtt-prod", summary: "x" },
        schema: { kind: "filled", resourceId: 3, name: "temps", summary: "y" },
      },
    };
    const next = canvasReducer(state, { type: "clear", slotKind: "source" });
    expect(next.slots.source).toEqual({ kind: "empty" });
    expect(next.slots.schema).toEqual(state.slots.schema);
  });

  it("closePanel returns configuring=null and reverts a configuring slot back to empty", () => {
    const state: CanvasState = {
      ...emptyCanvasState,
      slots: { ...emptyCanvasState.slots, source: { kind: "configuring", resourceType: "MQTT" } },
      configuring: "source",
    };
    const next = canvasReducer(state, { type: "closePanel" });
    expect(next.configuring).toBeNull();
    expect(next.slots.source.kind).toBe("empty");
  });

  it("setMeta merges meta fields without losing the others", () => {
    const next = canvasReducer(emptyCanvasState, { type: "setMeta", patch: { name: "p1" } });
    expect(next.meta).toEqual({ name: "p1", replicas: 1, groupId: null });
  });

  it("arm/disarm toggles the armed pointer", () => {
    const armed = canvasReducer(emptyCanvasState, { type: "arm", slotKind: "source", resourceType: "MQTT" });
    expect(armed.armed).toEqual({ slotKind: "source", resourceType: "MQTT" });
    const disarmed = canvasReducer(armed, { type: "disarm" });
    expect(disarmed.armed).toBeNull();
  });
});

describe("deploy gate", () => {
  function filled(): CanvasState {
    return {
      ...emptyCanvasState,
      slots: {
        source: { kind: "filled", resourceId: 1, name: "a", summary: "a" },
        schema: { kind: "filled", resourceId: 2, name: "b", summary: "b" },
        store:  { kind: "filled", resourceId: 3, name: "c", summary: "c" },
      },
      meta: { name: "p1", replicas: 1, groupId: null },
    };
  }

  it("ready when all filled + name + replicas≥1", () => {
    expect(deployReady(filled())).toBe(true);
    expect(deployBlockedReason(filled())).toBeNull();
  });

  it("blocks on missing broker", () => {
    const s = filled();
    s.slots.source = { kind: "empty" };
    expect(deployReady(s)).toBe(false);
    expect(deployBlockedReason(s)).toBe("Falta seleccionar una conexión");
  });

  it("blocks on empty name", () => {
    const s = filled();
    s.meta = { ...s.meta, name: "   " };
    expect(deployBlockedReason(s)).toBe("Escribe un nombre para el proyecto");
  });

  it("blocks on replicas < 1", () => {
    const s = filled();
    s.meta = { ...s.meta, replicas: 0 };
    expect(deployBlockedReason(s)).toBe("Debe haber al menos una réplica");
  });

  it("blocks values that the pipeline API would reject", () => {
    const longName = filled();
    longName.meta = { ...longName.meta, name: "a".repeat(31) };
    expect(deployReady(longName)).toBe(false);
    expect(deployBlockedReason(longName)).toBe("El nombre debe tener 30 caracteres o menos");

    const manyReplicas = filled();
    manyReplicas.meta = { ...manyReplicas.meta, replicas: 65 };
    expect(deployBlockedReason(manyReplicas)).toBe("Se permiten hasta 64 réplicas");
  });
});
