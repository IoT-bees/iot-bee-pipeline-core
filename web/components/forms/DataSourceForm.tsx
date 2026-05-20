"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

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
  disabled?: boolean;
}

export function DataSourceForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel,
  disabled,
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
  const router = useRouter();

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
      <fieldset disabled={disabled} className="border-0 p-0 m-0 min-w-0 disabled:opacity-60">
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
            <Input
              {...form.register("config.queue_name" as const)}
              placeholder="e.g. sensor.temperature.a"
            />
          </FormField>
          <FormField label="CONSUMER NAME">
            <Input
              {...form.register("config.consumer_name" as const)}
              placeholder="e.g. iot-bees-temp-consumer"
            />
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
          <FormField
            label="TOPIC"
            hint="supports wildcards: sensors/# or sensors/+/temp"
          >
            <Input
              {...form.register("config.topic" as const)}
              placeholder="sensors/temperature/room1"
            />
          </FormField>
          <FormField label="CLIENT ID">
            <Input
              {...form.register("config.client_id" as const)}
              placeholder="iot-bees-client-01"
            />
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
            <Input
              {...form.register("config.topic" as const)}
              placeholder="iot.events.raw"
            />
          </FormField>
          <FormField label="GROUP ID">
            <Input
              {...form.register("config.group_id" as const)}
              placeholder="iot-bees-consumer-group"
            />
          </FormField>
        </>
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
          onClick={() => router.push("/sources")}
        >
          cancel
        </Button>
      </div>
    </form>
  );
}
