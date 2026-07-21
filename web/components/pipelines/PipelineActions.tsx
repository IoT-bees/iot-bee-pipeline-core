"use client";
import { memo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
  const [confirmingStop, setConfirmingStop] = useState(false);
  const statusKnown = Boolean(status);
  const running = canStop(status);
  const actionDisabled = disabled || !statusKnown;

  function requestStop() {
    stop.reset();
    setConfirmingStop(true);
  }

  function confirmStop() {
    stop.mutate(id, {
      onSuccess: () => setConfirmingStop(false),
    });
  }

  function closeStopConfirmation() {
    if (stop.isPending) return;
    stop.reset();
    setConfirmingStop(false);
  }

  return (
    <>
      {!statusKnown ? (
        <Button variant="ghost" size="sm" disabled title="Comprobando el estado operativo">
          Comprobando estado
        </Button>
      ) : running ? (
        <Button variant="danger" size="sm" disabled={disabled} title={disabled ? "Solo consulta" : undefined} onClick={requestStop}>
          ■ Detener
        </Button>
      ) : (
        <Button variant="primary" size="sm" disabled={disabled} title={disabled ? "Solo consulta" : undefined} onClick={() => start.mutate(id)}>
          ▸ Iniciar
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          disabled={actionDisabled}
          title={!statusKnown ? "Comprobando el estado operativo" : disabled ? "Solo consulta" : undefined}
          onClick={() => {
            if (running) {
              pushToast({
                kind: "error",
                message: `No puedes eliminar el proyecto "${name}" porque está ${(status ?? "activo").toLowerCase()}. Deténlo primero.`,
              });
              return;
            }
            onDelete(id, name);
          }}
        >
          Eliminar
        </Button>
      )}
      <ConfirmDialog
        open={confirmingStop}
        title="¿Detener proyecto?"
        message={
          <>
            Confirma que autorizas detener{" "}
            <span className="font-semibold text-[var(--color-fg-0)]">{name}</span>.
            La recepción y el procesamiento de datos se pausarán hasta que vuelvas a iniciarlo.
          </>
        }
        eyebrow="Autorización requerida"
        error={stop.error instanceof Error ? stop.error.message : null}
        confirmLabel="Sí, detener proyecto"
        cancelLabel="Mantener en ejecución"
        danger
        busy={stop.isPending}
        onConfirm={confirmStop}
        onClose={closeStopConfirmation}
      />
    </>
  );
}

export const PipelineActions = memo(PipelineActionsBase);
