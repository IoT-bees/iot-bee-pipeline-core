"use client";
import { memo } from "react";
import { Button } from "@/components/ui/Button";
import { useStartPipeline } from "@/lib/hooks/useStartPipeline";
import { useStopPipeline } from "@/lib/hooks/useStopPipeline";
import { useToasts } from "@/lib/store/useToasts";
import { canStop } from "@/lib/status";

interface PipelineActionsProps {
  id: number;
  name: string;
  status?: string;
  onDelete?: (id: number, name: string) => void;
  disabled?: boolean;
}

function PipelineActionsBase({
  id,
  name,
  status,
  onDelete,
  disabled,
}: PipelineActionsProps) {
  const start = useStartPipeline();
  const stop = useStopPipeline();
  const pushToast = useToasts((s) => s.push);
  const running = canStop(status);
  return (
    <>
      {running ? (
        <Button variant="danger" size="sm" disabled={disabled} title={disabled ? "read-only" : undefined} onClick={() => stop.mutate(id)}>
          ■ stop
        </Button>
      ) : (
        <Button variant="primary" size="sm" disabled={disabled} title={disabled ? "read-only" : undefined} onClick={() => start.mutate(id)}>
          ▸ start
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (running) {
              pushToast({
                kind: "error",
                message: `cannot delete — pipeline "${name}" is ${(status ?? "running").toLowerCase()}. stop it first.`,
              });
              return;
            }
            onDelete(id, name);
          }}
        >
          delete
        </Button>
      )}
    </>
  );
}

export const PipelineActions = memo(PipelineActionsBase);
