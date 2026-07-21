"use client";
import { useDeferredValue, useEffect, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { UsersTable } from "@/components/admin/users/UsersTable";
import { CreateUserDialog } from "@/components/admin/users/CreateUserDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStateMessage } from "@/components/admin/AdminStateMessage";
import { useAdminUsers } from "@/lib/hooks/useAdminUsers";
import { useAuthMe } from "@/lib/hooks/useAuthMe";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "disabled" | "">("");
  const deferredSearch = useDeferredValue(search);
  const [cursors, setCursors] = useState<(number | undefined)[]>([undefined]);
  const cursor = cursors.at(-1);
  const filters = {
    cursor,
    limit: 50,
    q: deferredSearch || undefined,
    status: status || undefined,
  };
  const { data, isLoading, error, isFetching, refetch } = useAdminUsers(filters);
  const me = useAuthMe();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setCursors([undefined]);
  }, [deferredSearch, status]);

  return (
    <div className="space-y-4 font-mono">
      <AdminPageHeader
        title="Usuarios"
        description="Administra quién puede acceder a esta organización y qué nivel de permiso tiene. Los cambios de rol, acceso y contraseña requieren confirmación."
        action={<Button variant="primary" onClick={() => setOpen(true)}>+ Crear usuario</Button>}
        meta={data ? `${data.items.length} usuario${data.items.length === 1 ? "" : "s"} en esta página` : undefined}
      />
      <Panel className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <Input
            aria-label="Buscar usuarios"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o correo"
          />
          <Select
            aria-label="Filtrar por estado"
            value={status}
            onChange={(event) => setStatus(event.target.value as "active" | "disabled" | "")}
          >
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="disabled">Desactivados</option>
          </Select>
        </div>
        {isLoading && (
          <HoneycombLoader label="Cargando usuarios" />
        )}
        {error && <AdminStateMessage kind="error" title="No pudimos cargar los usuarios" description={(error as Error).message} onRetry={() => void refetch()} />}
        {data && data.items.length === 0 && !error && (
          <AdminStateMessage kind="empty" title="No hay usuarios que coincidan" description={search || status ? "Prueba a limpiar los filtros o cambia los criterios de búsqueda." : "Crea el primer usuario para darle acceso a esta organización."} />
        )}
        {data && data.items.length > 0 && (
          <UsersTable users={data.items} meId={me.data?.user.id ?? -1} />
        )}
        {data && (
          <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={cursors.length === 1 || isFetching}
              onClick={() => setCursors((pages) => pages.slice(0, -1))}
            >
              Anterior
            </Button>
            <span className="text-[11px] text-[var(--color-fg-3)]" aria-live="polite">
              {isFetching ? "Actualizando…" : `Página ${cursors.length}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={!data.nextCursor || isFetching}
              onClick={() => {
                const nextCursor = data.nextCursor;
                if (nextCursor != null) setCursors((pages) => [...pages, nextCursor]);
              }}
            >
              Siguiente
            </Button>
          </div>
        )}
      </Panel>
      <CreateUserDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
