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
}: {
  user: AdminUser;
  isSelf: boolean;
  onAskDeactivate: (u: AdminUser) => void;
}) {
  const patch = usePatchAdminUser(user.id);
  return (
    <TR>
      <TD className="font-mono text-[13px]">{user.email}</TD>
      <TD>{user.name}</TD>
      <TD>
        <Select
          value={user.role}
          disabled={isSelf}
          title={isSelf ? "You cannot change your own role" : undefined}
          onChange={(e) =>
            patch.mutate({
              role: e.target.value as "admin" | "operator",
            })
          }
          className="text-[12px]"
        >
          <option value="operator">operator</option>
          <option value="admin">admin</option>
        </Select>
      </TD>
      <TD>
        <StatusPill status={user.status} />
      </TD>
      <TD className="font-mono text-[11px] text-[var(--color-fg-3)]">
        {new Date(user.createdAt).toLocaleString()}
      </TD>
      <TD className="text-right">
        {!isSelf && user.status === "active" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAskDeactivate(user)}
          >
            deactivate
          </Button>
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
  const [pending, setPending] = useState<AdminUser | null>(null);

  function confirmDeactivate() {
    if (!pending) return;
    deactivate.mutate(pending.id, {
      onSettled: () => setPending(null),
    });
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
              onAskDeactivate={setPending}
            />
          ))}
        </tbody>
      </Table>
      <ConfirmDialog
        open={pending !== null}
        title={`Deactivate ${pending?.email ?? ""}?`}
        message={
          <>
            This will prevent{" "}
            <span className="text-[var(--color-fg-0)] font-bold">
              {pending?.email}
            </span>{" "}
            from signing in. Their data stays — re-activate any time by editing
            their status. Audit history is kept.
          </>
        }
        confirmLabel="Deactivate"
        danger
        busy={deactivate.isPending}
        onConfirm={confirmDeactivate}
        onClose={() => !deactivate.isPending && setPending(null)}
      />
    </>
  );
}
