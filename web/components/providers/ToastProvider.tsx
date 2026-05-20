"use client";
import { useToasts } from "@/lib/store/useToasts";
import { Toast } from "@/components/ui/Toast";

export function ToastProvider() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-[360px]">
      {toasts.map((t) => (
        <Toast key={t.id} kind={t.kind} message={t.message} />
      ))}
    </div>
  );
}
