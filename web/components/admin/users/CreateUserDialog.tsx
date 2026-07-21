"use client";
import { useState } from "react";
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
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "operator" | "viewer">("operator");
  const [tempPassword, setTempPassword] = useState(generateTempPassword);
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
            Crear usuario
          </h3>
          <p className="text-[12px] text-[var(--color-fg-3)] mt-1">
            El usuario recibirá una contraseña temporal. Compártela por un canal seguro: deberá cambiarla al ingresar por primera vez.
          </p>
        </div>
        <FormField label="correo electrónico">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="off"
          />
        </FormField>
        <FormField label="nombre">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </FormField>
        <FormField label="rol">
          <Select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "admin" | "operator" | "viewer")
            }
          >
            <option value="operator">operador</option>
            <option value="admin">administrador</option>
            <option value="viewer">consulta</option>
          </Select>
          {role === "viewer" && (
            <p className="text-[11px] text-[var(--color-fg-3)] mt-1">
              Acceso de consulta: puede ver los recursos, pero no crearlos, modificarlos ni eliminarlos.
            </p>
          )}
        </FormField>
        <FormField label="contraseña temporal">
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
              Copiar
            </Button>
          </div>
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? "Creando…" : "Crear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
