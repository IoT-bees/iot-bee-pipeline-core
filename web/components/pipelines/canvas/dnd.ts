import type { ResourceType, SlotKind } from "./types";

export const DND_MIME = "application/x-iot-bee-node";

export interface DndPayload {
  slotKind: SlotKind;
  resourceType: ResourceType;
}

const SLOT_KINDS: ReadonlyArray<SlotKind> = ["source", "schema", "store"];

function isSlotKind(v: unknown): v is SlotKind {
  return typeof v === "string" && (SLOT_KINDS as readonly string[]).includes(v);
}

export function encodePayload(p: DndPayload): string {
  return JSON.stringify(p);
}

export function decodePayload(dt: DataTransfer): DndPayload | null {
  const raw = dt.getData(DND_MIME);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  if (!isSlotKind(o.slotKind)) return null;
  if (typeof o.resourceType !== "string") return null;
  return { slotKind: o.slotKind, resourceType: o.resourceType as ResourceType };
}

export function matchesSlotKind(p: DndPayload, target: SlotKind): boolean {
  return p.slotKind === target;
}
