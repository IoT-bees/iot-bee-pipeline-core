"use client";
import { Controller, useFieldArray, useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { builderSchema, type BuilderInput } from "@/lib/schemas/validationSchema";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Panel } from "@/components/ui/Panel";

interface Props {
  defaultValues?: BuilderInput;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: SubmitHandler<BuilderInput>;
}

export function SchemaBuilder({
  defaultValues,
  submitLabel,
  submitting,
  onSubmit,
}: Props) {
  const form = useForm<BuilderInput>({
    resolver: zodResolver(builderSchema),
    defaultValues:
      defaultValues ??
      ({
        name: "",
        schema: {
          fields: [
            { name: "", field_type: "float", required: true, operations: [] },
          ],
        },
      } as BuilderInput),
  });
  const fields = useFieldArray({ control: form.control, name: "schema.fields" });
  const values = form.watch();

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid lg:grid-cols-[1fr_360px] gap-6"
    >
      <div>
        <FormField label="SCHEMA NAME" error={form.formState.errors.name?.message}>
          <Input {...form.register("name")} />
        </FormField>

        <h2 className="t-section mt-6 mb-3">{"// "}fields</h2>
        <div className="flex flex-col gap-3">
          {fields.fields.map((f, idx) => (
            <Panel key={f.id}>
              <div className="flex justify-between items-center mb-3">
                <div className="t-label">
                  {"// "}field {String(idx + 1).padStart(2, "0")}
                </div>
                <button
                  type="button"
                  onClick={() => fields.remove(idx)}
                  className="text-[10px] text-[var(--color-danger)]"
                >
                  remove
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <FormField label="NAME">
                  <Input {...form.register(`schema.fields.${idx}.name` as const)} />
                </FormField>
                <FormField label="TYPE">
                  <select
                    className="bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-3 py-[9px] text-[12px] font-mono rounded-[2px] w-full"
                    {...form.register(`schema.fields.${idx}.field_type` as const)}
                  >
                    <option value="float">float</option>
                    <option value="int">int</option>
                    <option value="bool">bool</option>
                    <option value="string">string</option>
                  </select>
                </FormField>
              </div>
              <div className="grid md:grid-cols-3 gap-3 mt-3">
                <label className="flex items-center gap-2 text-[11px] mt-5">
                  <input
                    type="checkbox"
                    {...form.register(`schema.fields.${idx}.required` as const)}
                  />{" "}
                  required
                </label>
                <FormField label="MIN">
                  <Input
                    type="number"
                    step="any"
                    {...form.register(`schema.fields.${idx}.min` as const, {
                      valueAsNumber: true,
                    })}
                  />
                </FormField>
                <FormField label="MAX">
                  <Input
                    type="number"
                    step="any"
                    {...form.register(`schema.fields.${idx}.max` as const, {
                      valueAsNumber: true,
                    })}
                  />
                </FormField>
              </div>

              <Controller
                control={form.control}
                name={`schema.fields.${idx}.operations` as const}
                render={({ field }) => {
                  const ops = field.value ?? [];
                  return (
                    <div className="mt-3">
                      <div className="t-label mb-2">{"// "}operations</div>
                      <div className="flex flex-col gap-2">
                        {ops.map((op, oi) => (
                          <div key={oi} className="flex gap-2 items-center">
                            <select
                              value={op.operator}
                              onChange={(e) => {
                                const v = [...ops];
                                v[oi] = {
                                  ...op,
                                  operator: e.target.value as
                                    | "Add"
                                    | "Subtract"
                                    | "Multiply"
                                    | "Divide",
                                };
                                field.onChange(v);
                              }}
                              className="bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-2 py-1 text-[11px] font-mono"
                            >
                              <option>Add</option>
                              <option>Subtract</option>
                              <option>Multiply</option>
                              <option>Divide</option>
                            </select>
                            <Input
                              value={op.operand}
                              type="number"
                              step="any"
                              onChange={(e) => {
                                const v = [...ops];
                                v[oi] = { ...op, operand: Number(e.target.value) };
                                field.onChange(v);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                field.onChange(ops.filter((_, i) => i !== oi))
                              }
                              className="text-[10px] text-[var(--color-danger)] px-2"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            field.onChange([...ops, { operator: "Add", operand: 0 }])
                          }
                          className="text-[10px] text-[var(--color-accent)] self-start"
                        >
                          + add operation
                        </button>
                      </div>
                    </div>
                  );
                }}
              />
            </Panel>
          ))}
        </div>

        <div className="flex gap-3 items-center mt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              fields.append({
                name: "",
                field_type: "float",
                required: true,
                operations: [],
              })
            }
          >
            + ADD FIELD
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitLabel}
          </Button>
        </div>
      </div>

      <aside>
        <h2 className="t-section mb-3">{"// "}preview</h2>
        <Panel>
          <pre className="text-[10px] font-mono leading-snug overflow-x-auto">
            {JSON.stringify({ name: values.name, schema: values.schema }, null, 2)}
          </pre>
        </Panel>
      </aside>
    </form>
  );
}
