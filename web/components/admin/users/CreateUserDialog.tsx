"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { ApiError } from "@/lib/api/client";
import { useCreateAdminUser } from "@/lib/hooks/useAdminUsers";

function generateTempPassword(): string {
  const a = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(12);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => a[value % a.length]).join("");
}

function createErrorMessage(error: Error | null): string | null {
  if (!error) return null;
  if (error instanceof ApiError && error.status === 409) {
    return "Ya existe un usuario con ese correo electrónico.";
  }
  if (error instanceof ApiError && error.status === 400) {
    return "Revisa el correo, el rol y que la contraseña temporal tenga al menos 8 caracteres.";
  }
  return error.message;
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
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const create = useCreateAdminUser();

  function reset() {
    setEmail("");
    setName("");
    setRole("operator");
    setTempPassword(generateTempPassword());
    setCreated(null);
    setValidationError(null);
    create.reset();
  }

  function close() {
    reset();
    onClose();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim();
    const normalizedName = name.trim();
    if (!normalizedName) {
      setValidationError("Escribe el nombre de la persona que recibirá el acceso.");
      return;
    }
    if (tempPassword.length < 8) {
      setValidationError("La contraseña temporal debe tener al menos 8 caracteres.");
      return;
    }
    setValidationError(null);
    create.mutate(
      { email: normalizedEmail, name: normalizedName, role, tempPassword },
      {
        onSuccess: (user) => {
          setCreated({ email: user.email, tempPassword });
        },
      },
    );
  }

  return (
    <Modal open={open} onClose={close}>
      {created ? (
        <div className="p-5 space-y-4">
          <div>
            <h3 className="text-[16px] font-bold text-[var(--color-fg-0)]">
              Usuario creado
            </h3>
            <p className="text-[12px] text-[var(--color-fg-3)] mt-1">
              Guarda y comparte esta contraseña temporal por un canal seguro. No volverá a mostrarse al cerrar esta ventana.
            </p>
          </div>
          <div className="rounded-[3px] border border-[var(--color-border-subtle)] p-3 text-[13px]">
            <div className="text-[11px] uppercase tracking-wide text-[var(--color-fg-3)]">correo</div>
            <div className="mt-1 font-mono text-[var(--color-fg-0)]">{created.email}</div>
            <div className="mt-3 text-[11px] uppercase tracking-wide text-[var(--color-fg-3)]">contraseña temporal</div>
            <div className="mt-1 flex gap-2">
              <Input value={created.tempPassword} readOnly className="font-mono" aria-label="Contraseña temporal creada" />
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigator.clipboard.writeText(created.tempPassword).catch(() => {})}
              >
                Copiar
              </Button>
            </div>
          </div>
          <p className="text-[12px] text-[var(--color-fg-3)]">
            La persona deberá cambiarla al iniciar sesión por primera vez.
          </p>
          <div className="flex justify-end pt-2">
            <Button type="button" variant="primary" onClick={close}>
              Listo
            </Button>
          </div>
        </div>
      ) : (
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
            autoComplete="name"
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
              minLength={8}
              autoComplete="new-password"
              className="font-mono"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => setTempPassword(generateTempPassword())}
            >
              Generar
            </Button>
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
        {(validationError || createErrorMessage(create.error)) && (
          <p role="alert" className="text-[12px] text-[var(--color-danger)]">
            {validationError ?? createErrorMessage(create.error)}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? "Creando…" : "Crear"}
          </Button>
        </div>
      </form>
      )}
    </Modal>
  );
}
