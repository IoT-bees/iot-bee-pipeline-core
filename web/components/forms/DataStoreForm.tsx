"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Eye, EyeOff } from "lucide-react";

import { storeSchema, type StoreInput } from "@/lib/schemas/store";
import type { CreateDataStoreRequest, StoreConfigUnion } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";

const persistenceOptions = [
  { value: "WEBHOOK", label: "Webhook HTTP" },
  { value: "INFLUX_DB", label: "InfluxDB" },
  { value: "LOCAL_LOG", label: "Registro local" },
] as const;

type PersistenceType = StoreInput["config"]["persistenceType"];

interface Props {
  defaultValues?: Partial<StoreInput>;
  onSubmit: (payload: CreateDataStoreRequest) => Promise<void> | void;
  submitting?: boolean;
  submitLabel: React.ReactNode;
  disabled?: boolean;
  onCancel?: () => void;
  showRequiredHint?: boolean;
}

export function DataStoreForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel,
  disabled,
  onCancel,
  showRequiredHint = true,
}: Props) {
  const form = useForm<StoreInput>({
    resolver: zodResolver(storeSchema),
    defaultValues:
      defaultValues ??
      ({
        name: "",
        description: "",
        config: { persistenceType: "WEBHOOK", url: "", bearer_token: "" },
      } as StoreInput),
  });
  const t = form.watch("config.persistenceType");
  const configErrors = form.formState.errors.config as Record<string, { message?: string } | undefined> | undefined;
  const router = useRouter();
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const [showBearerToken, setShowBearerToken] = useState(false);
  const typePickerRef = useRef<HTMLDivElement>(null);
  const selectedType = persistenceOptions.find((option) => option.value === t) ?? persistenceOptions[0];

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

  function selectPersistenceType(type: PersistenceType) {
    form.setValue("config.persistenceType", type, { shouldDirty: true, shouldValidate: true });
    setIsTypeMenuOpen(false);
  }

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
    } else if (c.persistenceType === "WEBHOOK") {
      configuration = {
        persistenceType: "WEBHOOK",
        url: c.url,
        bearer_token: c.bearer_token?.trim() || undefined,
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
      {showRequiredHint && <p className="t-mono mb-5">Los campos con <span className="text-[var(--color-danger)]">*</span> son obligatorios.</p>}
      <fieldset disabled={disabled} className="m-0 min-w-0 border-0 p-0 disabled:opacity-60 [&>div>div:first-child]:font-semibold">
      <FormField label={<>NOMBRE <RequiredMark /></>} error={form.formState.errors.name?.message}>
        <Input {...form.register("name")} aria-label="Nombre del destino" aria-required="true" placeholder="influx-produccion" />
      </FormField>
      <FormField
        label={<>DESCRIPCIÓN <RequiredMark /></>}
        error={form.formState.errors.description?.message}
      >
        <Input
          {...form.register("description")}
          aria-label="Descripción del destino"
          aria-required="true"
          placeholder="Dónde se entregan los registros validados"
        />
      </FormField>
      <FormField label={<>TIPO DE DESTINO <RequiredMark /></>} hint="Define cómo se entregarán los datos validados.">
        <div ref={typePickerRef} className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isTypeMenuOpen}
            aria-label="Tipo de destino"
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
              aria-label="Opciones de tipo de destino"
              className="absolute left-0 right-0 top-full z-20 mt-2 border border-[var(--color-border-strong)] bg-[var(--color-bg-panel)] p-1 shadow-[0_12px_28px_rgb(0_0_0_/_0.18)]"
            >
              {persistenceOptions.map((option) => {
                const isSelected = option.value === t;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className="flex min-h-10 w-full items-center justify-between px-3 text-left font-mono text-[14px] text-[var(--color-fg-1)] transition-colors hover:bg-[var(--color-bg-hover)] focus:bg-[var(--color-bg-hover)] focus:outline-none"
                    onClick={() => selectPersistenceType(option.value)}
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

      {t === "INFLUX_DB" && (
        <>
          <FormField label={<>URL <RequiredMark /></>} error={configErrors?.url?.message}>
            <Input
              {...form.register("config.url" as const)}
              aria-label="URL de InfluxDB"
              aria-required="true"
              placeholder="http://influxdb:8086"
              autoComplete="off"
            />
          </FormField>
          <FormField
            label={<>BASE DE DATOS <RequiredMark /></>}
            hint="Nombre de base de datos InfluxDB v1 (en v2 usa el bucket)"
            error={configErrors?.data_base?.message}
          >
            <Input
              {...form.register("config.data_base" as const)}
              aria-label="Base de datos de InfluxDB"
              aria-required="true"
              placeholder="sensores"
              autoComplete="off"
            />
          </FormField>
          <FormField label={<>MEDICIÓN <RequiredMark /></>} error={configErrors?.measurement?.message}>
            <Input
              {...form.register("config.measurement" as const)}
              aria-label="Medición de InfluxDB"
              aria-required="true"
              placeholder="lecturas_temperatura"
              autoComplete="off"
            />
          </FormField>
          <FormField label={<>TOKEN <RequiredMark /></>} error={configErrors?.token?.message}>
            <Input
              {...form.register("config.token" as const)}
              aria-label="Token de InfluxDB"
              aria-required="true"
              type="password"
              autoComplete="new-password"
            />
          </FormField>
          <FormField
            label="CAMPOS DE ETIQUETA (separados por comas)"
            hint="Campos de texto que se escribirán como etiquetas de InfluxDB"
          >
            <Input
              {...form.register("config.tag_fields" as const)}
              aria-label="Campos de etiqueta de InfluxDB"
              placeholder="location, device_id"
              autoComplete="off"
            />
          </FormField>
        </>
      )}

      {t === "LOCAL_LOG" && (
        <FormField label={<>NOMBRE DEL REGISTRO <RequiredMark /></>} error={configErrors?.log_name?.message}>
          <Input
            {...form.register("config.log_name" as const)}
            aria-label="Nombre del registro local"
            aria-required="true"
            placeholder="diagnostico"
          />
        </FormField>
      )}

      {t === "WEBHOOK" && (
        <>
          <FormField label={<>URL DEL ENDPOINT <RequiredMark /></>} hint="Los registros validados se envían como JSON mediante POST" error={configErrors?.url?.message}>
            <Input
              {...form.register("config.url" as const)}
              aria-label="URL del endpoint webhook"
              aria-required="true"
              type="url"
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://cliente.ejemplo.com/iot/eventos"
              autoComplete="off"
            />
          </FormField>
          <FormField label="TOKEN BEARER" hint="Opcional. Si lo indicas, debe tener al menos 8 caracteres." error={configErrors?.bearer_token?.message}>
            <div className="relative">
              <Input
                {...form.register("config.bearer_token" as const)}
                aria-label="Token Bearer del endpoint webhook"
                type={showBearerToken ? "text" : "password"}
                className="pr-11"
                autoComplete="new-password"
                spellCheck={false}
              />
              <button
                type="button"
                aria-label={showBearerToken ? "Ocultar token Bearer" : "Mostrar token Bearer"}
                aria-pressed={showBearerToken}
                className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center text-[var(--color-fg-3)] transition-colors hover:text-[var(--color-fg-1)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
                onClick={() => setShowBearerToken((show) => !show)}
              >
                {showBearerToken ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </FormField>
        </>
      )}

      </fieldset>
      <div className="flex flex-wrap gap-3 items-center mt-7 border-t border-[var(--color-border-subtle)] pt-5">
        {!disabled && (
          <Button type="submit" variant="primary" className="min-h-11 gap-2" disabled={submitting}>
            {submitting ? "Guardando…" : submitLabel}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={onCancel ?? (() => router.push("/stores"))}
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
