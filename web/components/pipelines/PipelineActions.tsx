"use client";
import { memo } from "react";
import { Button } from "@/components/ui/Button";
import { useStartPipeline } from "@/lib/hooks/useStartPipeline";
import { useStopPipeline } from "@/lib/hooks/useStopPipeline";
import { canStop } from "@/lib/status";

interface PipelineActionsProps {
  id: number;
  name: string;
  status?: string;
  onDelete?: (id: number, name: string) => void;
}

function PipelineActionsBase({
  id,
  name,
  status,
  onDelete,
}: PipelineActionsProps) {
  const start = useStartPipeline();
  const stop = useStopPipeline();
  const stoppable = canStop(status);
  return (
    <>
      {stoppable ? (
        <Button variant="danger" size="sm" onClick={() => stop.mutate(id)}>
          ■ stop
        </Button>
      ) : (
        <Button variant="primary" size="sm" onClick={() => start.mutate(id)}>
          ▸ start
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(id, name)}
        >
          delete
        </Button>
      )}
    </>
  );
}

export const PipelineActions = memo(PipelineActionsBase);
