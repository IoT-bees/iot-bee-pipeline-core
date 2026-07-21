"use client";
import { useToasts } from "@/lib/store/useToasts";
import { Toast } from "@/components/ui/Toast";

export function ToastProvider() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div
      aria-label="Notificaciones"
      className="fixed top-4 right-4 z-50 flex w-[calc(100%_-_2rem)] max-w-[400px] flex-col gap-2"
    >
      {toasts.map((t) => (
        <Toast key={t.id} kind={t.kind} message={t.message} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}
