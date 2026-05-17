"use client";
import { StatusGrid } from "@/components/admin/system/StatusGrid";
import { useSystemStatus } from "@/lib/hooks/useSystemStatus";

export default function AdminSystemPage() {
  const { data, isLoading, error } = useSystemStatus();
  return (
    <div className="space-y-4">
      <h2 className="text-[18px] font-bold text-[var(--color-fg-0)] font-mono">
        system
      </h2>
      {isLoading && (
        <div className="text-[13px] text-[var(--color-fg-3)] font-mono">
          Probing…
        </div>
      )}
      {error && (
        <div className="text-[13px] text-[var(--color-danger)] font-mono">
          {(error as Error).message}
        </div>
      )}
      {data && <StatusGrid status={data} />}
    </div>
  );
}
