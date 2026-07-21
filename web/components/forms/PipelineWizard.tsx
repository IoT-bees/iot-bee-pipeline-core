"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { pipelineSchema, type PipelineInput } from "@/lib/schemas/pipeline";
import type { CreatePipelineRequest } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Panel } from "@/components/ui/Panel";

const STEPS = [
  "DETALLES",
  "BROKER",
  "DATOS",
  "DESTINO",
  "GRUPO DE CLIENTE",
  "RÉPLICAS",
] as const;

interface Props {
  sources: { id: number; name: string; sourceType: string }[];
  schemas: { id: number; name: string }[];
  stores: { id: number; name: string; storeType: string }[];
  groups: { id: number; name: string }[];
  onSubmit: (payload: CreatePipelineRequest) => Promise<void> | void;
  submitting?: boolean;
}

export function PipelineWizard({
  sources,
  schemas,
  stores,
  groups,
  onSubmit,
  submitting,
}: Props) {
  const [step, setStep] = useState(0);
  const form = useForm<PipelineInput>({
    resolver: zodResolver(pipelineSchema),
    defaultValues: { name: "", description: "", pipelineReplication: 1 },
  });
  const errs = form.formState.errors;

  async function next() {
    const fields: (keyof PipelineInput)[][] = [
      ["name", "description"],
      ["dataSourceId"],
      ["validationSchemaId"],
      ["dataStoreId"],
      ["pipelineGroupId"],
      ["pipelineReplication"],
    ];
    const ok = await form.trigger(fields[step]);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function handleSubmit(values: PipelineInput): Promise<void> {
    await onSubmit({
      name: values.name,
      dataStoreId: values.dataStoreId,
      pipelineGroupId: values.pipelineGroupId,
      dataSourceId: values.dataSourceId,
      validationSchemaId: values.validationSchemaId,
      dataStoreDescription: values.description,
      pipelineReplication: values.pipelineReplication,
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="grid lg:grid-cols-[200px_1fr] gap-6"
    >
      <aside>
        <div className="t-label mb-2">Pasos</div>
        <ol className="flex flex-col gap-1 text-[12px]">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={
                i === step
                  ? "text-[var(--color-accent)]"
                  : i < step
                  ? "text-[var(--color-fg-2)]"
                  : "text-[var(--color-fg-4)]"
              }
            >
              {String(i + 1).padStart(2, "0")}/0{STEPS.length} · {s.toLowerCase()}
            </li>
          ))}
        </ol>
      </aside>
      <div>
        {step === 0 && (
          <Panel>
            <FormField label="NOMBRE DEL PROYECTO" error={errs.name?.message}>
              <Input {...form.register("name")} placeholder="frio-cliente-a" />
            </FormField>
            <FormField label="DESCRIPCIÓN" error={errs.description?.message}>
              <Input
                {...form.register("description")}
                placeholder="Proyecto del cliente y entrega de telemetría"
              />
            </FormField>
          </Panel>
        )}
        {step === 1 && (
          <Panel>
            <FormField label="BROKER DEL CLIENTE" error={errs.dataSourceId?.message}>
              <Select
                {...form.register("dataSourceId", { valueAsNumber: true })}
              >
                <option value="">— Selecciona uno —</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.sourceType})
                  </option>
                ))}
              </Select>
            </FormField>
          </Panel>
        )}
        {step === 2 && (
          <Panel>
            <FormField
              label="DEFINICIÓN DE DATOS"
              error={errs.validationSchemaId?.message}
            >
              <Select
                {...form.register("validationSchemaId", { valueAsNumber: true })}
              >
                <option value="">— Selecciona una —</option>
                {schemas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </Panel>
        )}
        {step === 3 && (
          <Panel>
            <FormField label="DESTINO DEL CLIENTE" error={errs.dataStoreId?.message}>
              <Select {...form.register("dataStoreId", { valueAsNumber: true })}>
                <option value="">— Selecciona uno —</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.storeType})
                  </option>
                ))}
              </Select>
            </FormField>
          </Panel>
        )}
        {step === 4 && (
          <Panel>
            <FormField
              label="GRUPO DE CLIENTE"
              error={errs.pipelineGroupId?.message}
            >
              <Select
                {...form.register("pipelineGroupId", { valueAsNumber: true })}
              >
                <option value="">— Selecciona uno —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </Panel>
        )}
        {step === 5 && (
          <Panel>
            <FormField
              label="RÉPLICAS (trabajadores)"
              hint="Cantidad de réplicas que se ejecutan en paralelo (1-64)"
              error={errs.pipelineReplication?.message}
            >
              <Input
                type="number"
                min={1}
                max={64}
                {...form.register("pipelineReplication", { valueAsNumber: true })}
              />
            </FormField>
          </Panel>
        )}

        <div className="flex gap-3 items-center mt-4">
          {step > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
            >
              ← Anterior
            </Button>
          )}
          {step < STEPS.length - 1 && (
            <Button type="button" variant="primary" onClick={next}>
              Siguiente →
            </Button>
          )}
          {step === STEPS.length - 1 && (
            <Button type="submit" variant="primary" disabled={submitting}>
              + CREAR PROYECTO
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
