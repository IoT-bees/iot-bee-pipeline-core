"use client";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { sourceSchema, type SourceInput } from "@/lib/schemas/source";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";

interface Props {
  defaultValues?: Partial<SourceInput>;
  onSubmit: SubmitHandler<SourceInput>;
  submitting?: boolean;
  submitLabel: string;
}

export function DataSourceForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel,
}: Props) {
  const form = useForm<SourceInput>({
    resolver: zodResolver(sourceSchema),
    defaultValues: defaultValues as SourceInput,
  });
  const type = form.watch("sourceType") ?? "RABBIT_MQ";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-[640px]">
      <FormField label="NAME" error={form.formState.errors.name?.message}>
        <Input {...form.register("name")} />
      </FormField>
      <FormField label="SOURCE TYPE">
        <select
          className="bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-3 py-[9px] text-[12px] font-mono rounded-[2px] w-full"
          {...form.register("sourceType")}
        >
          <option value="RABBIT_MQ">RABBIT_MQ</option>
          <option value="MQTT">MQTT</option>
          <option value="KAFKA">KAFKA</option>
        </select>
      </FormField>
      {type === "RABBIT_MQ" && (
        <>
          <FormField label="HOST">
            <Input
              {...form.register("config.host" as const)}
              placeholder="amqp://localhost:5672"
            />
          </FormField>
          <FormField label="QUEUE">
            <Input {...form.register("config.queue" as const)} />
          </FormField>
        </>
      )}
      {type === "MQTT" && (
        <>
          <FormField label="HOST">
            <Input
              {...form.register("config.host" as const)}
              placeholder="mqtt://localhost:1883"
            />
          </FormField>
          <FormField label="TOPIC">
            <Input {...form.register("config.topic" as const)} />
          </FormField>
        </>
      )}
      {type === "KAFKA" && (
        <>
          <FormField label="BROKERS">
            <Input
              {...form.register("config.brokers" as const)}
              placeholder="localhost:9092"
            />
          </FormField>
          <FormField label="TOPIC">
            <Input {...form.register("config.topic" as const)} />
          </FormField>
          <FormField label="GROUP ID">
            <Input {...form.register("config.group_id" as const)} />
          </FormField>
        </>
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
