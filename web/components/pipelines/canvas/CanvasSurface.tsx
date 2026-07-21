"use client";

import { CanvasSlot } from "./CanvasSlot";
import { CanvasWire } from "./CanvasWire";
import type { CanvasState, SlotKind } from "./types";

interface Props {
  state: CanvasState;
  onSlotDrop: (kind: SlotKind, resourceType: string) => void;
  onSlotOpen: (kind: SlotKind) => void;
  onSlotInspect?: (kind: SlotKind) => void;
  onSlotClear?: (kind: SlotKind) => void;
  onWrongKindDrop: (from: SlotKind, to: SlotKind) => void;
  compact?: boolean;
}

const ORDER: ReadonlyArray<SlotKind> = ["source", "schema", "store"];

export function CanvasSurface({ state, onSlotDrop, onSlotOpen, onSlotInspect, onSlotClear, onWrongKindDrop, compact = false }: Props) {
  return (
    <div
      data-testid="canvas-surface"
      className={`relative grid min-h-full w-full grid-cols-1 items-stretch gap-2 lg:h-full lg:flex-1 lg:grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)_48px_minmax(0,1fr)] lg:items-center lg:gap-0 ${
        compact ? "p-3 sm:p-4 md:p-5" : "p-4 md:p-7"
      }`}
      style={{
        backgroundColor: "var(--color-bg-elev)",
        backgroundImage:
          "linear-gradient(rgba(255,179,0,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(255,179,0,0.13) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      {ORDER.map((kind, i) => (
        <div key={kind} className="contents">
          <CanvasSlot
            kind={kind}
            state={state.slots[kind]}
            onDrop={(rt) => onSlotDrop(kind, rt)}
            onWrongKind={(from) => onWrongKindDrop(from, kind)}
            onOpen={() => onSlotOpen(kind)}
            onInspect={onSlotInspect ? () => onSlotInspect(kind) : undefined}
            onClear={onSlotClear ? () => onSlotClear(kind) : undefined}
            compact={compact}
          />
          {i < ORDER.length - 1 && (
            <CanvasWire
              active={
                state.slots[ORDER[i]].kind === "filled" &&
                state.slots[ORDER[i + 1]].kind === "filled"
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}
