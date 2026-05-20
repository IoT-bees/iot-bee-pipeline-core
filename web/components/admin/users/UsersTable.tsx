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
      className={`inline-block text-[10px] tracking-[1.5px] uppercase border px-2 py-[2px] rounded-[2px] ${
        ok
          ? "border-[var(--color-online)] text-[var(--color-online)]"
          : "border-[#333] text-[var(--color-fg-3)]"
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
}: {
  user: AdminUser;
  isSelf: boolean;
  onAskDeactivate: (u: AdminUser) => void;
  onAskActivate: (u: AdminUser) => void;
}) {
  const patch = usePatchAdminUser(user.id);
  return (
    <TR>
      <TD className="font-mono text-[13px]">
        {user.email}
        {user.mustResetPassword && (
          <span
            className="ml-2 inline-block text-[9px] tracking-[1.5px] uppercase border border-[var(--color-accent)] text-[var(--color-accent)] px-[6px] py-[1px] rounded-[2px]"
            title="User must reset password on next login"
          >
            reset
          </span>
        )}
      </TD>
      <TD>{user.name}</TD>
      <TD>
        <Select
          value={user.role}
          disabled={isSelf}
          title={isSelf ? "You cannot change your own role" : undefined}
          onChange={(e) =>
            patch.mutate({
              role: e.target.value as "admin" | "operator" | "viewer",
            })
          }
          className="text-[12px]"
        >
          <option value="operator">operator</option>
          <option value="admin">admin</option>
          <option value="viewer">viewer</option>
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
                    onClick={() => patch.mutate({ mustResetPassword: true })}
                    title="Force this user to reset their password at next login"
                  >
                    force password reset
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAskDeactivate(user)}
                >
                  deactivate
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAskActivate(user)}
                title="Re-enable this user; they can sign in again"
              >
                activate
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
  const activate = usePatchAdminUser(pendingActivate?.id ?? 0);

  function confirmDeactivate() {
    if (!pendingDeactivate) return;
    deactivate.mutate(pendingDeactivate.id, {
      onSettled: () => setPendingDeactivate(null),
    });
  }

  function confirmActivate() {
    if (!pendingActivate) return;
    activate.mutate(
      { status: "active" },
      { onSettled: () => setPendingActivate(null) },
    );
  }

  return (
    <>
      <Table>
        <THead>
          <TH>email</TH>
          <TH>name</TH>
          <TH>role</TH>
          <TH>status</TH>
          <TH>created</TH>
          <TH className="text-right">actions</TH>
        </THead>
        <tbody>
          {users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              isSelf={u.id === meId}
              onAskDeactivate={setPendingDeactivate}
              onAskActivate={setPendingActivate}
            />
          ))}
        </tbody>
      </Table>
      <ConfirmDialog
        open={pendingDeactivate !== null}
        title={`Deactivate ${pendingDeactivate?.email ?? ""}?`}
        message={
          <>
            This will prevent{" "}
            <span className="text-[var(--color-fg-0)] font-bold">
              {pendingDeactivate?.email}
            </span>{" "}
            from signing in. Their data stays — re-activate any time by editing
            their status. Audit history is kept.
          </>
        }
        confirmLabel="Deactivate"
        danger
        busy={deactivate.isPending}
        onConfirm={confirmDeactivate}
        onClose={() => !deactivate.isPending && setPendingDeactivate(null)}
      />
      <ConfirmDialog
        open={pendingActivate !== null}
        title={`Activate ${pendingActivate?.email ?? ""}?`}
        message={
          <>
            This will let{" "}
            <span className="text-[var(--color-fg-0)] font-bold">
              {pendingActivate?.email}
            </span>{" "}
            sign in again with their existing password and access organization
            data. Audit history continues from where it left off.
          </>
        }
        confirmLabel="Activate"
        busy={activate.isPending}
        onConfirm={confirmActivate}
        onClose={() => !activate.isPending && setPendingActivate(null)}
      />
    </>
  );
}
