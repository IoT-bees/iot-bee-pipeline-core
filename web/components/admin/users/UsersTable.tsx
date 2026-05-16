"use client";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
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
}: {
  user: AdminUser;
  isSelf: boolean;
}) {
  const patch = usePatchAdminUser(user.id);
  const deactivate = useDeactivateAdminUser();
  return (
    <TR>
      <TD className="font-mono text-[13px]">{user.email}</TD>
      <TD>{user.name}</TD>
      <TD>
        <Select
          value={user.role}
          disabled={isSelf}
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
            onClick={() => {
              if (
                confirm(
                  `Deactivate ${user.email}? They will no longer be able to sign in.`,
                )
              ) {
                deactivate.mutate(user.id);
              }
            }}
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
  return (
    <Table>
      <THead>
        <TR>
          <TH>email</TH>
          <TH>name</TH>
          <TH>role</TH>
          <TH>status</TH>
          <TH>created</TH>
          <TH className="text-right">actions</TH>
        </TR>
      </THead>
      <tbody>
        {users.map((u) => (
          <UserRow key={u.id} user={u} isSelf={u.id === meId} />
        ))}
      </tbody>
    </Table>
  );
}
