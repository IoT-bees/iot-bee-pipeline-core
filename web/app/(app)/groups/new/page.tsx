"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCreateGroup } from "@/lib/hooks/useGroups";
import { groupSchema, type GroupInput } from "@/lib/schemas/group";

export default function NewGroupPage() {
  const router = useRouter();
  const create = useCreateGroup();
  const form = useForm<GroupInput>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: "", description: "" },
  });
  const nameError = form.formState.errors.name?.message;
  const descriptionError = form.formState.errors.description?.message;
  const submitError = create.error instanceof Error ? create.error.message : null;

  return (
    <div className="max-w-2xl">
      <h1 className="t-title mb-1">Nuevo grupo</h1>
      <p className="t-mono mb-6">Crea un contexto para reunir proyectos por cliente, sede o ambiente.</p>

      <form
        onSubmit={form.handleSubmit(async (values) => {
          await create.mutateAsync(values);
          router.push("/groups");
        })}
        className="space-y-5"
      >
        {submitError && (
          <div role="alert" className="border border-[var(--color-danger)] px-3 py-2 text-[13px] text-[var(--color-danger)]">
            No pudimos crear el grupo. {submitError}
          </div>
        )}
        <div>
          <label htmlFor="group-name" className="t-label font-semibold">
            Nombre del grupo <span className="text-[var(--color-danger)]" aria-hidden="true">*</span>
          </label>
          <Input
            id="group-name"
            {...form.register("name")}
            placeholder="Ej. cliente-andina"
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
            placeholder="Ej. Proyectos de la sede Bogotá"
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
          <Button type="submit" variant="primary" className="gap-2" disabled={create.isPending}>
            {create.isPending ? "Guardando…" : <><Plus size={16} aria-hidden="true" /> Crear grupo</>}
          </Button>
          <Button type="button" variant="ghost" disabled={create.isPending} onClick={() => router.push("/groups")}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
