"use client";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { pipelineSchema, type PipelineInput } from "@/lib/schemas/pipeline";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Panel } from "@/components/ui/Panel";

const STEPS = ["NAME", "SOURCE", "SCHEMA", "STORE", "REPLICATION"] as const;

export function PipelineWizard({
  sources,
  schemas,
  stores,
  onSubmit,
  submitting,
}: {
  sources: { id: number; name: string; sourceType: string }[];
  schemas: { id: number; name: string }[];
  stores: { id: number; name: string; persistenceType: string }[];
  onSubmit: SubmitHandler<PipelineInput>;
  submitting?: boolean;
}) {
  const [step, setStep] = useState(0);
  const form = useForm<PipelineInput>({
    resolver: zodResolver(pipelineSchema),
    defaultValues: { replication: 1 },
  });

  async function next() {
    const fields: (keyof PipelineInput)[][] = [
      ["name"],
      ["data_source_id"],
      ["validation_schema_id"],
      ["data_store_id"],
      ["replication"],
    ];
    const ok = await form.trigger(fields[step]);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid lg:grid-cols-[200px_1fr] gap-6"
    >
      <aside>
        <div className="t-label mb-2">{"// "}steps</div>
        <ol className="flex flex-col gap-1 text-[11px]">
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
              {String(i + 1).padStart(2, "0")}/05 · {s.toLowerCase()}
            </li>
          ))}
        </ol>
      </aside>
      <div>
        {step === 0 && (
          <Panel>
            <FormField
              label="PIPELINE NAME"
              error={form.formState.errors.name?.message}
            >
              <Input {...form.register("name")} placeholder="temp-rabbit" />
            </FormField>
          </Panel>
        )}
        {step === 1 && (
          <Panel>
            <div className="t-label mb-2">{"// "}DATA SOURCE</div>
            <select
              className="bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-3 py-[9px] text-[12px] font-mono rounded-[2px] w-full"
              {...form.register("data_source_id", { valueAsNumber: true })}
            >
              <option value="">— pick one —</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.sourceType})
                </option>
              ))}
            </select>
            {form.formState.errors.data_source_id && (
              <div className="text-[10px] text-[var(--color-danger)] mt-1">
                × {form.formState.errors.data_source_id.message}
              </div>
            )}
          </Panel>
        )}
        {step === 2 && (
          <Panel>
            <div className="t-label mb-2">{"// "}VALIDATION SCHEMA</div>
            <select
              className="bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-3 py-[9px] text-[12px] font-mono rounded-[2px] w-full"
              {...form.register("validation_schema_id", { valueAsNumber: true })}
            >
              <option value="">— pick one —</option>
              {schemas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {form.formState.errors.validation_schema_id && (
              <div className="text-[10px] text-[var(--color-danger)] mt-1">
                × {form.formState.errors.validation_schema_id.message}
              </div>
            )}
          </Panel>
        )}
        {step === 3 && (
          <Panel>
            <div className="t-label mb-2">{"// "}DATA STORE</div>
            <select
              className="bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-3 py-[9px] text-[12px] font-mono rounded-[2px] w-full"
              {...form.register("data_store_id", { valueAsNumber: true })}
            >
              <option value="">— pick one —</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.persistenceType})
                </option>
              ))}
            </select>
            {form.formState.errors.data_store_id && (
              <div className="text-[10px] text-[var(--color-danger)] mt-1">
                × {form.formState.errors.data_store_id.message}
              </div>
            )}
          </Panel>
        )}
        {step === 4 && (
          <Panel>
            <FormField
              label="REPLICATION (workers)"
              hint="how many concurrent replicas to run"
              error={form.formState.errors.replication?.message}
            >
              <Input
                type="number"
                min={1}
                max={64}
                {...form.register("replication", { valueAsNumber: true })}
              />
            </FormField>
          </Panel>
        )}

        <div className="flex gap-3 items-center mt-4">
          {step > 0 && (
            <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
              ← back
            </Button>
          )}
          {step < STEPS.length - 1 && (
            <Button type="button" variant="primary" onClick={next}>
              next →
            </Button>
          )}
          {step === STEPS.length - 1 && (
            <Button type="submit" variant="primary" disabled={submitting}>
              + CREATE PIPELINE
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
