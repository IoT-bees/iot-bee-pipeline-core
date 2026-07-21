"use client";
import { StatusGrid } from "@/components/admin/system/StatusGrid";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { useSystemStatus } from "@/lib/hooks/useSystemStatus";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStateMessage } from "@/components/admin/AdminStateMessage";

export default function AdminSystemPage() {
  const { data, isLoading, error, refetch } = useSystemStatus();
  return (
    <div className="space-y-5">
      <AdminPageHeader title="Estado del sistema" description="Estado actual de los servicios conectados y de la operación. Esta vista se actualiza automáticamente cada 15 segundos mientras está abierta." />
      {isLoading && (
        <HoneycombLoader label="Verificando" />
      )}
      {error && <AdminStateMessage kind="error" title="No pudimos verificar el sistema" description={(error as Error).message} onRetry={() => void refetch()} />}
      {data && <StatusGrid status={data} />}
    </div>
  );
}
