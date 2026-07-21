"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";

import { sourceSchema, type SourceInput } from "@/lib/schemas/source";
import type { CreateDataSourceRequest, SourceConfigUnion } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";

const sourceTypeOptions = [
  { value: "RABBIT_MQ", label: "RabbitMQ (AMQP)" },
  { value: "MQTT", label: "MQTT" },
  { value: "KAFKA", label: "KAFKA" },
] as const;

type SourceType = SourceInput["config"]["sourceType"];

interface Props {
  defaultValues?: Partial<SourceInput>;
  onSubmit: (payload: CreateDataSourceRequest) => Promise<void> | void;
  submitting?: boolean;
  submitLabel: React.ReactNode;
  disabled?: boolean;
  onCancel?: () => void;
  submitError?: string | null;
  showRequiredHint?: boolean;
  showActionSeparator?: boolean;
}

export function DataSourceForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel,
  disabled,
  onCancel,
  submitError,
  showRequiredHint = true,
  showActionSeparator = false,
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
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const typePickerRef = useRef<HTMLDivElement>(null);
  const selectedType = sourceTypeOptions.find((option) => option.value === sourceType) ?? sourceTypeOptions[0];

  useEffect(() => {
    if (!isTypeMenuOpen) return;

    function closeTypeMenu(event: MouseEvent) {
      if (!typePickerRef.current?.contains(event.target as Node)) {
        setIsTypeMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeTypeMenu);
    return () => document.removeEventListener("mousedown", closeTypeMenu);
  }, [isTypeMenuOpen]);

  function selectSourceType(type: SourceType) {
    form.setValue("config.sourceType", type, { shouldDirty: true, shouldValidate: true });
    setIsTypeMenuOpen(false);
  }

  const protocolDescription = {
    RABBIT_MQ: "Usa la URL AMQP, la cola que se consumirá y un nombre único para el consumidor.",
    MQTT: "Usa la URL del broker, el tópico a suscribir y un identificador único para el cliente.",
    KAFKA: "Indica uno o más brokers, el tópico y el grupo de consumidores que recibirá los eventos.",
  }[sourceType];

  function configError(field: string): string | undefined {
    const errors = form.formState.errors.config as Record<string, { message?: string }> | undefined;
    return errors?.[field]?.message;
  }

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
    try {
      await onSubmit({
        name: values.name,
        dataSourceConfiguration: configuration,
        dataSourceDescription: values.description,
      });
    } catch {
      // El error se presenta junto al formulario y en las notificaciones globales.
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-[720px]">
      {showRequiredHint && <p className="t-mono mb-5">Los campos con <span className="text-[var(--color-danger)]">*</span> son obligatorios.</p>}
      <fieldset disabled={disabled} className="m-0 min-w-0 border-0 p-0 disabled:opacity-60 [&>div>div:first-child]:font-semibold">
        <FormField label={<>NOMBRE <RequiredMark /></>} error={form.formState.errors.name?.message}>
          <Input {...form.register("name")} aria-required="true" placeholder="temperatura-planta" />
        </FormField>
        <FormField
          label={<>DESCRIPCIÓN <RequiredMark /></>}
          error={form.formState.errors.description?.message}
        >
          <Input
            {...form.register("description")}
            aria-required="true"
            placeholder="Broker del cliente para esta instalación"
          />
        </FormField>
        <FormField
          label={<>TIPO DE BROKER <RequiredMark /></>}
          hint="El protocolo debe coincidir con el sistema que publica los datos."
        >
          <div ref={typePickerRef} className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isTypeMenuOpen}
              aria-label="Tipo de broker"
              className="flex w-full items-center justify-between rounded-[2px] border border-[var(--color-border)] bg-[var(--color-bg-panel)] px-3 py-[10px] font-mono text-[14px] text-[var(--color-fg-1)] outline-none transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent)]"
              onClick={() => setIsTypeMenuOpen((open) => !open)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setIsTypeMenuOpen(true);
                }
                if (event.key === "Escape") setIsTypeMenuOpen(false);
              }}
            >
              <span>{selectedType.label}</span>
              <ChevronDown
                size={18}
                aria-hidden="true"
                className={`shrink-0 text-[var(--color-fg-3)] transition-transform ${isTypeMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isTypeMenuOpen && (
              <div
                role="listbox"
                aria-label="Opciones de tipo de broker"
                className="absolute left-0 right-0 top-full z-20 mt-2 border border-[var(--color-border-strong)] bg-[var(--color-bg-panel)] p-1 shadow-[0_12px_28px_rgb(0_0_0_/_0.18)]"
              >
                {sourceTypeOptions.map((option) => {
                  const isSelected = option.value === sourceType;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className="flex min-h-10 w-full items-center justify-between px-3 text-left font-mono text-[14px] text-[var(--color-fg-1)] transition-colors hover:bg-[var(--color-bg-hover)] focus:bg-[var(--color-bg-hover)] focus:outline-none"
                      onClick={() => selectSourceType(option.value)}
                    >
                      {option.label}
                      {isSelected && <Check size={16} aria-hidden="true" className="text-[var(--color-accent-strong)]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </FormField>

        <div className="mb-5 border-y border-[var(--color-border-subtle)] py-3">
          <div className="t-label mb-1 text-[var(--color-accent-strong)]">
            Configuración de {sourceType === "RABBIT_MQ" ? "RabbitMQ" : sourceType}
          </div>
          <p className="t-body">{protocolDescription}</p>
        </div>

        {sourceType === "RABBIT_MQ" && (
          <>
            <FormField label={<>URL <RequiredMark /></>} error={configError("url")}>
              <Input
                {...form.register("config.url" as const)}
                aria-required="true"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="amqp://user:pass@host:5672"
              />
            </FormField>
            <FormField label={<>NOMBRE DE LA COLA <RequiredMark /></>} error={configError("queue_name")}>
              <Input
                {...form.register("config.queue_name" as const)}
                aria-required="true"
                placeholder="sensores.temperatura.a"
              />
            </FormField>
            <FormField label={<>NOMBRE DEL CONSUMIDOR <RequiredMark /></>} error={configError("consumer_name")}>
              <Input
                {...form.register("config.consumer_name" as const)}
                aria-required="true"
                placeholder="iot-bees-temperatura"
              />
            </FormField>
          </>
        )}

        {sourceType === "MQTT" && (
          <>
            <FormField label={<>URL DEL BROKER <RequiredMark /></>} error={configError("broker_url")}>
              <Input
                {...form.register("config.broker_url" as const)}
                aria-required="true"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="mqtt://host:1883"
              />
            </FormField>
            <FormField
              label={<>TÓPICO <RequiredMark /></>}
              hint="Admite comodines: sensors/# o sensors/+/temp"
              error={configError("topic")}
            >
              <Input
                {...form.register("config.topic" as const)}
                aria-required="true"
                placeholder="sensors/temperature/room1"
              />
            </FormField>
            <FormField label={<>ID DEL CLIENTE <RequiredMark /></>} error={configError("client_id")}>
              <Input
                {...form.register("config.client_id" as const)}
                aria-required="true"
                placeholder="iot-bees-client-01"
              />
            </FormField>
          </>
        )}

        {sourceType === "KAFKA" && (
          <>
            <FormField
              label={<>BROKERS (separados por comas) <RequiredMark /></>}
              hint="Ejemplo: kafka1:9092, kafka2:9092"
              error={configError("brokers")}
            >
              <Input
                {...form.register("config.brokers" as const)}
                aria-required="true"
                placeholder="host:9092"
              />
            </FormField>
            <FormField label={<>TÓPICO <RequiredMark /></>} error={configError("topic")}>
              <Input
                {...form.register("config.topic" as const)}
                aria-required="true"
                placeholder="iot.events.raw"
              />
            </FormField>
            <FormField label={<>ID DEL GRUPO <RequiredMark /></>} error={configError("group_id")}>
              <Input
                {...form.register("config.group_id" as const)}
                aria-required="true"
                placeholder="iot-bees-consumer-group"
              />
            </FormField>
          </>
        )}

      </fieldset>
      {submitError && (
        <div
          className="border border-[var(--color-danger)] bg-[var(--color-bg-panel)] px-3 py-3 text-[13px] text-[var(--color-danger)]"
          role="alert"
        >
          No se pudieron guardar los cambios: {submitError}
        </div>
      )}
      <div className={showActionSeparator ? "mt-7 flex flex-wrap items-center gap-3 border-t border-[var(--color-border-subtle)] pt-5" : "mt-6 flex items-center gap-3"}>
        {!disabled && (
          <Button type="submit" variant="primary" className="gap-2" disabled={submitting}>
            {submitLabel}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel ?? (() => router.push("/sources"))}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function RequiredMark() {
  return <span className="text-[var(--color-danger)]" aria-hidden="true">*</span>;
}
