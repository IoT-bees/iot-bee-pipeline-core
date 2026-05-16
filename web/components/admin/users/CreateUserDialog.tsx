"use client";
import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { useCreateAdminUser } from "@/lib/hooks/useAdminUsers";

function generateTempPassword(): string {
  const a = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++)
    out += a[Math.floor(Math.random() * a.length)];
  return out;
}

export function CreateUserDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const initialPassword = useMemo(() => generateTempPassword(), [open]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "operator">("operator");
  const [tempPassword, setTempPassword] = useState(initialPassword);
  const create = useCreateAdminUser();

  function reset() {
    setEmail("");
    setName("");
    setRole("operator");
    setTempPassword(generateTempPassword());
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      { email, name, role, tempPassword },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={submit} className="p-5 space-y-4">
        <div>
          <h3 className="text-[16px] font-bold text-[var(--color-fg-0)]">
            Create user
          </h3>
          <p className="text-[12px] text-[var(--color-fg-3)] mt-1">
            The user will be created with a temporary password. Share it
            securely — they will be asked to change it on first login.
          </p>
        </div>
        <FormField label="email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="off"
          />
        </FormField>
        <FormField label="name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </FormField>
        <FormField label="role">
          <Select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "admin" | "operator")
            }
          >
            <option value="operator">operator</option>
            <option value="admin">admin</option>
          </Select>
        </FormField>
        <FormField label="temporary password">
          <div className="flex gap-2">
            <Input
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              required
              className="font-mono"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                navigator.clipboard.writeText(tempPassword).catch(() => {})
              }
            >
              copy
            </Button>
          </div>
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
