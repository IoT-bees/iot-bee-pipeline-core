"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { sourceSchema, type SourceInput } from "@/lib/schemas/source";
import type { CreateDataSourceRequest, SourceConfigUnion } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";

interface Props {
  defaultValues?: Partial<SourceInput>;
  onSubmit: (payload: CreateDataSourceRequest) => Promise<void> | void;
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
    defaultValues:
      defaultValues ??
      ({
        name: "",
        description: "",
        config: {
          sourceType: "RABBIT_MQ",
          url: "",
          queue_name: "",
          consumer_name: "",
        },
      } as SourceInput),
  });

  const sourceType = form.watch("config.sourceType");

  async function handleSubmit(values: SourceInput): Promise<void> {
    const cfg = values.config;
    let configuration: SourceConfigUnion;
    if (cfg.sourceType === "KAFKA") {
      configuration = {
        sourceType: "KAFKA",
        brokers: cfg.brokers.split(",").map((s) => s.trim()).filter(Boolean),
        topic: cfg.topic,
        group_id: cfg.group_id,
      };
    } else if (cfg.sourceType === "MQTT") {
      configuration = {
        sourceType: "MQTT",
        broker_url: cfg.broker_url,
        topic: cfg.topic,
        client_id: cfg.client_id,
      };
    } else {
      configuration = {
        sourceType: "RABBIT_MQ",
        url: cfg.url,
        queue_name: cfg.queue_name,
        consumer_name: cfg.consumer_name,
      };
    }
    await onSubmit({
      name: values.name,
      dataSourceConfiguration: configuration,
      dataSourceDescription: values.description,
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-[640px]">
      <FormField label="NAME" error={form.formState.errors.name?.message}>
        <Input {...form.register("name")} placeholder="e.g. factory-temperature" />
      </FormField>
      <FormField
        label="DESCRIPTION"
        error={form.formState.errors.description?.message}
      >
        <Input
          {...form.register("description")}
          placeholder="what this source feeds"
        />
      </FormField>
      <FormField label="SOURCE TYPE">
        <Select {...form.register("config.sourceType")}>
          <option value="RABBIT_MQ">RABBIT_MQ</option>
          <option value="MQTT">MQTT</option>
          <option value="KAFKA">KAFKA</option>
        </Select>
      </FormField>

      {sourceType === "RABBIT_MQ" && (
        <>
          <FormField label="URL">
            <Input
              {...form.register("config.url" as const)}
              placeholder="amqp://user:pass@host:5672"
            />
          </FormField>
          <FormField label="QUEUE NAME">
            <Input {...form.register("config.queue_name" as const)} />
          </FormField>
          <FormField label="CONSUMER NAME">
            <Input {...form.register("config.consumer_name" as const)} />
          </FormField>
        </>
      )}

      {sourceType === "MQTT" && (
        <>
          <FormField label="BROKER URL">
            <Input
              {...form.register("config.broker_url" as const)}
              placeholder="mqtt://host:1883"
            />
          </FormField>
          <FormField label="TOPIC">
            <Input {...form.register("config.topic" as const)} />
          </FormField>
          <FormField label="CLIENT ID">
            <Input {...form.register("config.client_id" as const)} />
          </FormField>
        </>
      )}

      {sourceType === "KAFKA" && (
        <>
          <FormField
            label="BROKERS (comma-separated)"
            hint="example: kafka1:9092, kafka2:9092"
          >
            <Input
              {...form.register("config.brokers" as const)}
              placeholder="host:9092"
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

      <div className="flex gap-3 items-center mt-6">
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
