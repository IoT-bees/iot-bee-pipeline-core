"use client";

import { ArrowDown, ArrowRight } from "lucide-react";

interface Props {
  active: boolean;
}

export function CanvasWire({ active }: Props) {
  const tone = active ? "var(--color-accent)" : "var(--color-border)";
  return (
    <div data-testid="wire" aria-hidden="true" className={active ? "flow-line" : "dim"}>
      <span className="flex h-8 flex-col items-center justify-center lg:hidden">
        <span
          className="h-2 w-[2px]"
          style={{ backgroundImage: `repeating-linear-gradient(180deg, ${tone} 0 6px, transparent 6px 10px)` }}
        />
        <ArrowDown size={15} style={{ color: tone }} strokeWidth={2.5} />
      </span>
      <span className="hidden h-8 w-12 items-center lg:flex">
        <span
          className="h-[2px] flex-1"
          style={{ backgroundImage: `repeating-linear-gradient(90deg, ${tone} 0 6px, transparent 6px 10px)` }}
        />
        <ArrowRight size={16} style={{ color: tone }} strokeWidth={2.5} />
      </span>
    </div>
  );
}
