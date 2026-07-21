"use client";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  eyebrow?: string;
  error?: string | null;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  eyebrow,
  error,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger,
  busy,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissOnBackdrop={!busy}
      className="max-w-[520px]"
    >
      <div className="p-5 text-left sm:p-6">
        <div className="mb-4">
          <div className="t-label mb-1.5">
            {eyebrow ?? (danger ? "Acción irreversible" : "Confirmación")}
          </div>
          <h3 className="text-[22px] font-semibold leading-tight text-[var(--color-fg-0)]">
            {title}
          </h3>
        </div>
        <div className="mb-6 text-left text-[15px] leading-6 text-[var(--color-fg-2)]">
          {message}
        </div>
        {error && (
          <div className="text-[12px] text-[var(--color-danger)] mb-4 border border-[var(--color-danger)] px-3 py-2 rounded-[2px] bg-[var(--color-bg-base)]">
            × {error}
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--color-border-subtle)] pt-4 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full sm:w-auto"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={danger ? "danger" : "primary"}
            size="sm"
            className="w-full sm:w-auto"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
