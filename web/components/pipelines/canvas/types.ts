export type SlotKind = "source" | "schema" | "store";

export type SourceResourceType = "MQTT" | "RABBIT_MQ" | "KAFKA";
export type SchemaResourceType = "NEW_SCHEMA";
export type StoreResourceType = "INFLUX_DB" | "LOCAL_LOG" | "WEBHOOK";
export type ResourceType =
  | SourceResourceType
  | SchemaResourceType
  | StoreResourceType;

export type SlotState =
  | { kind: "empty" }
  | {
      kind: "configuring";
      resourceType?: ResourceType;
      preselectId?: number;
      previous?: { resourceId: number; name: string; summary: string };
    }
  | { kind: "filled"; resourceId: number; name: string; summary: string };

export interface CanvasMeta {
  name: string;
  replicas: number;
  groupId: number | null;
}

export interface CanvasDrag {
  from: SlotKind;
  resourceType: ResourceType;
}

export interface CanvasState {
  slots: { source: SlotState; schema: SlotState; store: SlotState };
  meta: CanvasMeta;
  configuring: SlotKind | null;
  drag: CanvasDrag | null;
  armed: { slotKind: SlotKind; resourceType: ResourceType } | null;
}

export const emptyCanvasState: CanvasState = {
  slots: { source: { kind: "empty" }, schema: { kind: "empty" }, store: { kind: "empty" } },
  meta: { name: "", replicas: 1, groupId: null },
  configuring: null,
  drag: null,
  armed: null,
};
