"use client";

import { encodePayload, DND_MIME } from "./dnd";
import type { ResourceType, SlotKind } from "./types";

interface Props {
  slotKind: SlotKind;
  resourceType: ResourceType;
  label: string;
  armed: boolean;
  onArmToggle: () => void;
}

export function CanvasPaletteItem({ slotKind, resourceType, label, armed, onArmToggle }: Props) {
  return (
    <button
      type="button"
      draggable
      aria-pressed={armed}
      onClick={onArmToggle}
      onDragStart={(e) => {
        e.dataTransfer.setData(DND_MIME, encodePayload({ slotKind, resourceType }));
        e.dataTransfer.effectAllowed = "copy";
      }}
      className={`flex min-w-[118px] items-center gap-2 px-3 py-2 text-[12px] text-left bg-[var(--color-bg-panel)] rounded-[3px] border shadow-sm ${
        armed ? "border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]" : "border-[var(--color-border-subtle)]"
      } hover:border-[var(--color-accent)] cursor-grab active:cursor-grabbing transition-colors`}
    >
      <span className="text-[var(--color-accent)] font-bold">+</span>
      <span className="capitalize">{label}</span>
    </button>
  );
}
