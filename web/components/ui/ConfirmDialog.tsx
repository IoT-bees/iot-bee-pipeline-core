"use client";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
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
  error,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  busy,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} dismissOnBackdrop={!busy}>
      <div className="px-5 py-5">
        <div className="text-[10px] tracking-[2px] uppercase text-[var(--color-fg-3)] mb-2">
          {"// "}{danger ? "destructive action" : "confirm"}
        </div>
        <h3 className="text-[20px] font-bold text-[var(--color-fg-0)] tracking-[-0.5px] mb-3">
          {title}
        </h3>
        <div className="text-[14px] text-[var(--color-fg-2)] leading-[1.55] mb-4">
          {message}
        </div>
        {error && (
          <div className="text-[12px] text-[var(--color-danger)] mb-4 border border-[var(--color-danger)] border-l-2 px-3 py-2 rounded-[2px] bg-[var(--color-bg-base)]">
            × {error}
          </div>
        )}
        <div className="flex gap-3 justify-end items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={danger ? "danger" : "primary"}
            size="sm"
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
