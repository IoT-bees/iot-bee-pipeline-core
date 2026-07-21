"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToasts } from "@/lib/store/useToasts";

interface Props {
  currentValue: number;
  onApply: (newValue: number) => Promise<void>;
  pipelineStatus: string | undefined;
  maxValue?: number;
}

const MIN = 1;

export function RescaleControl({
  currentValue,
  onApply,
  pipelineStatus,
  maxValue,
}: Props) {
  const [value, setValue] = useState(currentValue);
  const [busy, setBusy] = useState(false);
  const pushToast = useToasts((store) => store.push);
  const changed = value !== currentValue;
  const hotScale = pipelineStatus && pipelineStatus.toLowerCase() !== "idle";
  const atLimit = maxValue !== undefined && value >= maxValue;

  async function handleApply() {
    setBusy(true);
    try {
      await onApply(value);
    } finally {
      setBusy(false);
    }
  }

  function increaseReplicas() {
    if (atLimit) {
      pushToast({
        kind: "warning",
        message: `Este proyecto ya tiene las ${maxValue} réplica${maxValue === 1 ? "" : "s"} incluidas en tu plan.`,
      });
      return;
    }
    setValue((current) => current + 1);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Reducir réplicas"
          onClick={() => setValue((v) => Math.max(MIN, v - 1))}
        >
          −
        </Button>
        <span className="font-mono text-[16px] w-6 text-center">{value}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Aumentar réplicas"
          onClick={increaseReplicas}
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
          disabled={busy}
        >
          {hotScale ? "Aplicar en vivo" : "Aplicar"}
        </Button>
      )}
      {changed && hotScale && (
        <span className="text-[14px] text-[var(--color-accent)] font-mono">
          ↻ Se aplica en vivo y se conserva al reiniciar
        </span>
      )}
    </div>
  );
}
