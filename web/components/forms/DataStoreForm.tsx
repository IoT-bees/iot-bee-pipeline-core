"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import { storeSchema, type StoreInput } from "@/lib/schemas/store";
import type { CreateDataStoreRequest, StoreConfigUnion } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";

interface Props {
  defaultValues?: Partial<StoreInput>;
  onSubmit: (payload: CreateDataStoreRequest) => Promise<void> | void;
  submitting?: boolean;
  submitLabel: string;
  disabled?: boolean;
}

export function DataStoreForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel,
  disabled,
}: Props) {
  const form = useForm<StoreInput>({
    resolver: zodResolver(storeSchema),
    defaultValues:
      defaultValues ??
      ({
        name: "",
        description: "",
        config: { persistenceType: "LOCAL_LOG", log_name: "" },
      } as StoreInput),
  });
  const t = form.watch("config.persistenceType");
  const router = useRouter();

  async function handleSubmit(values: StoreInput): Promise<void> {
    const c = values.config;
    let configuration: StoreConfigUnion;
    if (c.persistenceType === "INFLUX_DB") {
      const tags = (c.tag_fields ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      configuration = {
        persistenceType: "INFLUX_DB",
        url: c.url,
        data_base: c.data_base,
        measurement: c.measurement,
        token: c.token,
        tag_fields: tags,
      };
    } else {
      configuration = { persistenceType: "LOCAL_LOG", log_name: c.log_name };
    }
    await onSubmit({
      name: values.name,
      dataStoreConfiguration: configuration,
      dataStoreDescription: values.description,
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="max-w-[640px]"
      autoComplete="off"
    >
      <fieldset disabled={disabled} className="border-0 p-0 m-0 min-w-0 disabled:opacity-60">
      <FormField label="NAME" error={form.formState.errors.name?.message}>
        <Input {...form.register("name")} placeholder="e.g. influx-prod" />
      </FormField>
      <FormField
        label="DESCRIPTION"
        error={form.formState.errors.description?.message}
      >
        <Input
          {...form.register("description")}
          placeholder="what this store holds"
        />
      </FormField>
      <FormField label="STORE TYPE">
        <Select {...form.register("config.persistenceType")}>
          <option value="LOCAL_LOG">LOCAL_LOG</option>
          <option value="INFLUX_DB">INFLUX_DB</option>
        </Select>
      </FormField>

      {t === "INFLUX_DB" && (
        <>
          <FormField label="URL">
            <Input
              {...form.register("config.url" as const)}
              placeholder="http://influxdb:8086"
              autoComplete="off"
            />
          </FormField>
          <FormField
            label="DATABASE"
            hint="InfluxDB v1 database name (v2: use bucket name)"
          >
            <Input
              {...form.register("config.data_base" as const)}
              placeholder="e.g. sensors"
              autoComplete="off"
            />
          </FormField>
          <FormField label="MEASUREMENT">
            <Input
              {...form.register("config.measurement" as const)}
              placeholder="e.g. temperature_readings"
              autoComplete="off"
            />
          </FormField>
          <FormField label="TOKEN">
            <Input
              {...form.register("config.token" as const)}
              type="password"
              autoComplete="new-password"
            />
          </FormField>
          <FormField
            label="TAG FIELDS (comma-separated)"
            hint="string fields written as InfluxDB tags"
          >
            <Input
              {...form.register("config.tag_fields" as const)}
              placeholder="location, device_id"
              autoComplete="off"
            />
          </FormField>
        </>
      )}

      {t === "LOCAL_LOG" && (
        <FormField label="LOG NAME">
          <Input
            {...form.register("config.log_name" as const)}
            placeholder="e.g. debug"
          />
        </FormField>
      )}

      </fieldset>
      <div className="flex gap-3 items-center mt-6">
        {!disabled && (
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitLabel}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/stores")}
        >
          cancel
        </Button>
      </div>
    </form>
  );
}
