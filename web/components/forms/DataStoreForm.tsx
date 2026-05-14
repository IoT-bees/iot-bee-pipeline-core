"use client";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { storeSchema, type StoreInput } from "@/lib/schemas/store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";

interface Props {
  defaultValues?: Partial<StoreInput>;
  onSubmit: SubmitHandler<StoreInput>;
  submitting?: boolean;
  submitLabel: string;
}

export function DataStoreForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel,
}: Props) {
  const form = useForm<StoreInput>({
    resolver: zodResolver(storeSchema),
    defaultValues: defaultValues as StoreInput,
  });
  const t = form.watch("persistenceType") ?? "INFLUX_DB";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-[640px]">
      <FormField label="NAME" error={form.formState.errors.name?.message}>
        <Input {...form.register("name")} />
      </FormField>
      <FormField label="STORE TYPE">
        <select
          className="bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-3 py-[9px] text-[12px] font-mono rounded-[2px] w-full"
          {...form.register("persistenceType")}
        >
          <option value="INFLUX_DB">INFLUX_DB</option>
          <option value="LOCAL_LOG">LOCAL_LOG</option>
        </select>
      </FormField>
      {t === "INFLUX_DB" && (
        <>
          <FormField label="HOST">
            <Input
              {...form.register("host" as const)}
              placeholder="http://localhost:8086"
            />
          </FormField>
          <FormField label="DATABASE">
            <Input {...form.register("database" as const)} />
          </FormField>
          <FormField label="MEASUREMENT">
            <Input {...form.register("measurement" as const)} />
          </FormField>
          <FormField label="TAG FIELDS (comma-separated)">
            <Input
              placeholder="location,device_id"
              {...form.register("tag_fields" as const, {
                setValueAs: (v) =>
                  typeof v === "string"
                    ? v.split(",").map((s) => s.trim()).filter(Boolean)
                    : v,
              })}
            />
          </FormField>
        </>
      )}
      {t === "LOCAL_LOG" && (
        <FormField label="LOG NAME">
          <Input {...form.register("log_name" as const)} />
        </FormField>
      )}
      <div className="flex gap-3 items-center mt-4">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={() => history.back()}>
          cancel
        </Button>
      </div>
    </form>
  );
}
