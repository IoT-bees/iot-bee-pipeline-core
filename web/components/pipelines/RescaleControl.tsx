"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { canStop } from "@/lib/status";

interface Props {
  currentValue: number;
  onApply: (newValue: number) => Promise<void>;
  pipelineStatus: string | undefined;
}

const MIN = 1;

export function RescaleControl({
  currentValue,
  onApply,
  pipelineStatus,
}: Props) {
  const [value, setValue] = useState(currentValue);
  const [busy, setBusy] = useState(false);
  const blocked = canStop(pipelineStatus);
  const changed = value !== currentValue;

  async function handleApply() {
    setBusy(true);
    try {
      await onApply(value);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setValue((v) => Math.max(MIN, v - 1))}
        >
          −
        </Button>
        <span className="font-mono text-[16px] w-6 text-center">{value}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setValue((v) => v + 1)}
        >
          +
        </Button>
      </div>
      {changed && (
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleApply}
          disabled={busy || blocked}
        >
          apply
        </Button>
      )}
      {changed && blocked && (
        <span className="text-[12px] text-[var(--color-danger)] font-mono">
          × pipeline is running — stop it first
        </span>
      )}
    </div>
  );
}
