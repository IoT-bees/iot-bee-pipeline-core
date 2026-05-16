"use client";
import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { UsersTable } from "@/components/admin/users/UsersTable";
import { CreateUserDialog } from "@/components/admin/users/CreateUserDialog";
import { useAdminUsers } from "@/lib/hooks/useAdminUsers";
import { useAuthMe } from "@/lib/hooks/useAuthMe";

export default function AdminUsersPage() {
  const { data, isLoading, error } = useAdminUsers();
  const me = useAuthMe();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4 font-mono">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-[var(--color-fg-0)]">
          users
        </h2>
        <Button variant="primary" onClick={() => setOpen(true)}>
          + Create user
        </Button>
      </div>
      <Panel>
        {isLoading && (
          <div className="text-[13px] text-[var(--color-fg-3)]">Loading…</div>
        )}
        {error && (
          <div className="text-[13px] text-[var(--color-danger)]">
            {(error as Error).message}
          </div>
        )}
        {data && (
          <UsersTable users={data.items} meId={me.data?.user.id ?? -1} />
        )}
      </Panel>
      <CreateUserDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
