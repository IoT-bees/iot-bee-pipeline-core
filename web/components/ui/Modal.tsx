"use client";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  dismissOnBackdrop?: boolean;
}

export function Modal({
  open,
  onClose,
  children,
  className,
  dismissOnBackdrop = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !dismissOnBackdrop) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissOnBackdrop, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[var(--color-overlay)] flex items-center justify-center p-4"
      onClick={() => dismissOnBackdrop && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "bg-[var(--color-bg-panel)] border border-[var(--color-accent)] rounded-[3px] w-full max-w-[480px] font-mono",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
