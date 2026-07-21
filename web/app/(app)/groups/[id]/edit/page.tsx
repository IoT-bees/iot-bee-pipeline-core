"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { useGroup, useUpdateGroup } from "@/lib/hooks/useGroups";
import { groupSchema, type GroupInput } from "@/lib/schemas/group";

export default function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const groupId = Number(id);
  const isValidGroupId = Number.isInteger(groupId) && groupId > 0;
  const router = useRouter();
  const groupQ = useGroup(isValidGroupId ? groupId : Number.NaN);
  const update = useUpdateGroup(groupId);
  const form = useForm<GroupInput>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: "", description: "" },
  });
  const group = groupQ.data;
  const nameError = form.formState.errors.name?.message;
  const descriptionError = form.formState.errors.description?.message;
  const submitError = update.error instanceof Error ? update.error.message : null;

  useEffect(() => {
    if (group) form.reset({ name: group.name, description: group.description });
  }, [form, group]);

  if (!isValidGroupId) {
    return <GroupLoadError message="La dirección del grupo no es válida." onBack={() => router.push("/groups")} />;
  }

  if (groupQ.isPending) return <HoneycombLoader label="Cargando grupo" />;

  if (groupQ.isError || !group) {
    return <GroupLoadError message="No encontramos este grupo. Puede haber sido eliminado." onBack={() => router.push("/groups")} />;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="t-title mb-1">Editar grupo</h1>
      <p className="t-mono mb-6">Actualiza el nombre o el propósito sin modificar los proyectos asociados.</p>

      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          await update.mutateAsync(values);
          router.push("/groups");
        })}
      >
        {submitError && (
          <div role="alert" className="border border-[var(--color-danger)] px-3 py-2 text-[13px] text-[var(--color-danger)]">
            No pudimos guardar los cambios. {submitError}
          </div>
        )}
        <div>
          <label htmlFor="group-name" className="t-label font-semibold">
            Nombre del grupo <span className="text-[var(--color-danger)]" aria-hidden="true">*</span>
          </label>
          <Input
            id="group-name"
            {...form.register("name")}
            className="mt-1.5"
            maxLength={30}
            autoFocus
            aria-label="Nombre del grupo"
            aria-required="true"
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? "group-name-error" : undefined}
          />
          {nameError && <p id="group-name-error" role="alert" className="mt-1.5 text-[13px] text-[var(--color-danger)]">{nameError}</p>}
        </div>
        <div>
          <label htmlFor="group-description" className="t-label font-semibold">
            Propósito <span className="text-[var(--color-danger)]" aria-hidden="true">*</span>
          </label>
          <Input
            id="group-description"
            {...form.register("description")}
            className="mt-1.5"
            maxLength={255}
            aria-label="Propósito"
            aria-required="true"
            aria-invalid={Boolean(descriptionError)}
            aria-describedby={descriptionError ? "group-description-error" : "group-description-help"}
          />
          <p id="group-description-help" className="mt-1.5 text-[13px] text-[var(--color-fg-3)]">Explica qué proyectos reúne para que el equipo lo entienda de inmediato.</p>
          {descriptionError && <p id="group-description-error" role="alert" className="mt-1.5 text-[13px] text-[var(--color-danger)]">{descriptionError}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border-subtle)] pt-5">
          <Button type="submit" variant="primary" disabled={update.isPending}>{update.isPending ? "Guardando…" : "Guardar cambios"}</Button>
          <Button type="button" variant="ghost" disabled={update.isPending} onClick={() => router.push("/groups")}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}

function GroupLoadError({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <Panel tone="danger">
      <div role="alert">
        <h1 className="text-[18px] font-semibold text-[var(--color-fg-0)]">No se puede editar el grupo</h1>
        <p className="mt-1 text-[14px] text-[var(--color-fg-2)]">{message}</p>
        <Button type="button" variant="ghost" className="mt-4" onClick={onBack}>Volver a grupos</Button>
      </div>
    </Panel>
  );
}
