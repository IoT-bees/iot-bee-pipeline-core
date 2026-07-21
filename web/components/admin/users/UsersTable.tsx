"use client";
import { useState } from "react";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  usePatchAdminUser,
  useDeactivateAdminUser,
} from "@/lib/hooks/useAdminUsers";
import type { AdminUser } from "@/lib/api/types";

function StatusPill({ status }: { status: string }) {
  const ok = status === "active";
  return (
    <span
      className={`inline-block text-[10px] uppercase border px-2 py-[2px] rounded-[2px] ${
        ok
          ? "border-[var(--color-online)] text-[var(--color-online)]"
          : "border-[var(--color-border-strong)] text-[var(--color-fg-3)]"
      }`}
    >
      {status}
    </span>
  );
}

function UserRow({
  user,
  isSelf,
  onAskDeactivate,
  onAskActivate,
  onAskRoleChange,
  onAskPasswordReset,
}: {
  user: AdminUser;
  isSelf: boolean;
  onAskDeactivate: (u: AdminUser) => void;
  onAskActivate: (u: AdminUser) => void;
  onAskRoleChange: (user: AdminUser, role: AdminUser["role"]) => void;
  onAskPasswordReset: (user: AdminUser) => void;
}) {
  return (
    <TR>
      <TD className="font-mono text-[13px]">
        {user.email}
        {user.mustResetPassword && (
          <span
            className="ml-2 inline-block text-[9px] uppercase border border-[var(--color-accent)] text-[var(--color-accent)] px-[6px] py-[1px] rounded-[2px]"
            title="Debe renovar la contraseña en el próximo acceso"
          >
            renovar clave
          </span>
        )}
      </TD>
      <TD>{user.name}</TD>
      <TD>
        <Select
          value={user.role}
          disabled={isSelf}
          title={isSelf ? "No puedes cambiar tu propio rol" : undefined}
          onChange={(e) =>
            onAskRoleChange(
              user,
              e.target.value as "admin" | "operator" | "viewer",
            )
          }
          className="text-[12px]"
        >
          <option value="operator">operador</option>
          <option value="admin">administrador</option>
          <option value="viewer">consulta</option>
        </Select>
      </TD>
      <TD>
        <StatusPill status={user.status} />
      </TD>
      <TD className="font-mono text-[11px] text-[var(--color-fg-3)]">
        {new Date(user.createdAt).toLocaleString()}
      </TD>
      <TD className="text-right">
        {!isSelf && (
          <div className="flex items-center justify-end gap-2">
            {user.status === "active" ? (
              <>
                {!user.mustResetPassword && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAskPasswordReset(user)}
                    title="Solicita que este usuario renueve la contraseña en el próximo acceso"
                  >
                    Renovar clave
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAskDeactivate(user)}
                >
                  Desactivar
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAskActivate(user)}
                title="Vuelve a habilitar este usuario para que pueda ingresar"
              >
                Activar
              </Button>
            )}
          </div>
        )}
      </TD>
    </TR>
  );
}

export function UsersTable({
  users,
  meId,
}: {
  users: AdminUser[];
  meId: number;
}) {
  const deactivate = useDeactivateAdminUser();
  const [pendingDeactivate, setPendingDeactivate] = useState<AdminUser | null>(
    null,
  );
  const [pendingActivate, setPendingActivate] = useState<AdminUser | null>(
    null,
  );
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    user: AdminUser;
    role: AdminUser["role"];
  } | null>(null);
  const [pendingPasswordReset, setPendingPasswordReset] = useState<AdminUser | null>(
    null,
  );
  const activate = usePatchAdminUser(pendingActivate?.id ?? 0);
  const updateRole = usePatchAdminUser(pendingRoleChange?.user.id ?? 0);
  const resetPassword = usePatchAdminUser(pendingPasswordReset?.id ?? 0);

  function confirmDeactivate() {
    if (!pendingDeactivate) return;
    deactivate.mutate(pendingDeactivate.id, {
      onSuccess: () => setPendingDeactivate(null),
    });
  }

  function confirmActivate() {
    if (!pendingActivate) return;
    activate.mutate(
      { status: "active" },
      { onSuccess: () => setPendingActivate(null) },
    );
  }

  function confirmRoleChange() {
    if (!pendingRoleChange) return;
    updateRole.mutate(
      { role: pendingRoleChange.role },
      { onSuccess: () => setPendingRoleChange(null) },
    );
  }

  function confirmPasswordReset() {
    if (!pendingPasswordReset) return;
    resetPassword.mutate(
      { mustResetPassword: true },
      { onSuccess: () => setPendingPasswordReset(null) },
    );
  }

  return (
    <>
      <Table>
        <THead>
          <TH>correo</TH>
          <TH>nombre</TH>
          <TH>rol</TH>
          <TH>estado</TH>
          <TH>creado</TH>
          <TH className="text-right">acciones</TH>
        </THead>
        <tbody>
          {users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              isSelf={u.id === meId}
              onAskDeactivate={setPendingDeactivate}
              onAskActivate={setPendingActivate}
              onAskRoleChange={(user, role) =>
                role !== user.role && setPendingRoleChange({ user, role })
              }
              onAskPasswordReset={setPendingPasswordReset}
            />
          ))}
        </tbody>
      </Table>
      <ConfirmDialog
        open={pendingDeactivate !== null}
        title={`¿Desactivar ${pendingDeactivate?.email ?? ""}?`}
        message={
          <>
            Esto impedirá que{" "}
            <span className="text-[var(--color-fg-0)] font-bold">
              {pendingDeactivate?.email}
            </span>{" "}
            ingrese. Sus datos permanecen; puedes activarlo de nuevo cuando lo necesites. Se conserva el historial de auditoría.
          </>
        }
        confirmLabel="Desactivar"
        danger
        busy={deactivate.isPending}
        error={deactivate.error?.message}
        onConfirm={confirmDeactivate}
        onClose={() => !deactivate.isPending && setPendingDeactivate(null)}
      />
      <ConfirmDialog
        open={pendingActivate !== null}
        title={`¿Activar ${pendingActivate?.email ?? ""}?`}
        message={
          <>
            Esto permitirá que{" "}
            <span className="text-[var(--color-fg-0)] font-bold">
              {pendingActivate?.email}
            </span>{" "}
            ingrese de nuevo con su contraseña actual y acceda a los datos de clientes. El historial de auditoría continúa.
          </>
        }
        confirmLabel="Activar"
        busy={activate.isPending}
        error={activate.error?.message}
        onConfirm={confirmActivate}
        onClose={() => !activate.isPending && setPendingActivate(null)}
      />
      <ConfirmDialog
        open={pendingRoleChange !== null}
        title={`¿Cambiar el rol de ${pendingRoleChange?.user.email ?? ""}?`}
        message={
          <>
            Pasará de <strong>{pendingRoleChange?.user.role}</strong> a{" "}
            <strong>{pendingRoleChange?.role}</strong>. El nuevo permiso se
            aplicará en el próximo acceso y puede cambiar qué datos y acciones
            están disponibles.
          </>
        }
        confirmLabel="Cambiar rol"
        busy={updateRole.isPending}
        error={updateRole.error?.message}
        onConfirm={confirmRoleChange}
        onClose={() => !updateRole.isPending && setPendingRoleChange(null)}
      />
      <ConfirmDialog
        open={pendingPasswordReset !== null}
        title={`¿Solicitar renovación de clave a ${pendingPasswordReset?.email ?? ""}?`}
        message="El usuario deberá cambiar su contraseña en el próximo acceso. Esta acción no revoca su sesión actual."
        confirmLabel="Solicitar renovación"
        busy={resetPassword.isPending}
        error={resetPassword.error?.message}
        onConfirm={confirmPasswordReset}
        onClose={() => !resetPassword.isPending && setPendingPasswordReset(null)}
      />
    </>
  );
}
