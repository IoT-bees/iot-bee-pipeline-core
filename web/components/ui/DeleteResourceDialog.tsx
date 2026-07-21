"use client";
import { ConfirmDialog } from "./ConfirmDialog";

interface DeleteResourceDialogProps {
  pending: { name: string } | null;
  resourceLabel: string;
  impact: React.ReactNode;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteResourceDialog({
  pending,
  resourceLabel,
  impact,
  busy,
  error,
  onConfirm,
  onClose,
}: DeleteResourceDialogProps) {
  return (
    <ConfirmDialog
      open={pending !== null}
      title={`¿Eliminar ${resourceLabel}?`}
      message={
        <>
          Esta acción elimina de forma permanente{" "}
          <span className="text-[var(--color-fg-0)] font-bold">
            {pending?.name}
          </span>
          . {impact}
        </>
      }
      confirmLabel={`Eliminar ${resourceLabel}`}
      danger
      busy={busy}
      error={error}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
