"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { useCreatePlan, usePatchPlan } from "@/lib/hooks/usePlans";
import type { Plan } from "@/lib/api/types";

interface PlanFormState {
  slug: string;
  displayName: string;
  description: string;
  priceDollars: string;
  currency: string;
  maxPipelines: string;
  maxReplicasPerPipeline: string;
  includedMessagesMonthly: string;
  alertsEnabled: boolean;
  premiumConnectors: boolean;
  multiUser: boolean;
  isCustom: boolean;
  stripePriceId: string;
  organizationId: string;
}

const empty: PlanFormState = {
  slug: "",
  displayName: "",
  description: "",
  priceDollars: "0",
  currency: "USD",
  maxPipelines: "10",
  maxReplicasPerPipeline: "4",
  includedMessagesMonthly: "100000",
  alertsEnabled: false,
  premiumConnectors: false,
  multiUser: false,
  isCustom: false,
  stripePriceId: "",
  organizationId: "",
};

function planToForm(p: Plan): PlanFormState {
  return {
    slug: p.slug,
    displayName: p.displayName,
    description: p.description ?? "",
    priceDollars: (p.priceCents / 100).toFixed(2),
    currency: p.currency,
    maxPipelines: p.maxPipelines.toString(),
    maxReplicasPerPipeline: p.maxReplicasPerPipeline.toString(),
    includedMessagesMonthly: p.includedMessagesMonthly.toString(),
    alertsEnabled: p.alertsEnabled,
    premiumConnectors: p.premiumConnectors,
    multiUser: p.multiUser,
    isCustom: p.isCustom,
    stripePriceId: p.stripePriceId ?? "",
    organizationId: p.organizationId?.toString() ?? "",
  };
}

export function PlanDialog({
  open,
  onClose,
  editing,
  defaultIsCustom,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Plan;
  defaultIsCustom?: boolean;
}) {
  const [form, setForm] = useState<PlanFormState>(empty);
  const [formError, setFormError] = useState<string | null>(null);
  const create = useCreatePlan();
  const patch = usePatchPlan(editing?.id ?? -1);

  useEffect(() => {
    if (editing) {
      setForm(planToForm(editing));
    } else {
      setForm({
        ...empty,
        isCustom: !!defaultIsCustom,
      });
    }
    setFormError(null);
  }, [editing, defaultIsCustom, open]);

  function set<K extends keyof PlanFormState>(k: K, v: PlanFormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(form.priceDollars || "0") * 100);
    const maxPipelines = parseInt(form.maxPipelines, 10);
    const maxReplicas = parseInt(form.maxReplicasPerPipeline, 10);
    const includedMessagesMonthly = parseInt(form.includedMessagesMonthly, 10);
    if (!Number.isFinite(priceCents) || priceCents < 0 || !Number.isInteger(maxPipelines) || maxPipelines < 0 || !Number.isInteger(maxReplicas) || maxReplicas < 0 || !Number.isInteger(includedMessagesMonthly) || includedMessagesMonthly < 0) {
      setFormError("Revisa los valores numéricos: deben ser números enteros positivos o cero.");
      return;
    }
    const organizationIdValue = form.isCustom ? parseInt(form.organizationId, 10) : undefined;
    if (form.isCustom && (!Number.isInteger(organizationIdValue) || organizationIdValue == null || organizationIdValue < 1)) {
      setFormError("Indica el ID válido de la organización a la que pertenece este plan personalizado.");
      return;
    }
    const organizationId = organizationIdValue;
    setFormError(null);

    if (editing) {
      patch.mutate(
        {
          displayName: form.displayName,
          description: form.description || null,
          priceCents,
          currency: form.currency.toUpperCase(),
          maxPipelines,
          maxReplicasPerPipeline: maxReplicas,
          includedMessagesMonthly,
          alertsEnabled: form.alertsEnabled,
          premiumConnectors: form.premiumConnectors,
          multiUser: form.multiUser,
          stripePriceId: form.stripePriceId || null,
        },
        { onSuccess: () => onClose() },
      );
    } else {
      create.mutate(
        {
          slug: form.slug,
          displayName: form.displayName,
          description: form.description || null,
          priceCents,
          currency: form.currency.toUpperCase(),
          maxPipelines,
          maxReplicasPerPipeline: maxReplicas,
          includedMessagesMonthly,
          alertsEnabled: form.alertsEnabled,
          premiumConnectors: form.premiumConnectors,
          multiUser: form.multiUser,
          isCustom: form.isCustom,
          organizationId,
          stripePriceId: form.stripePriceId || null,
        },
        { onSuccess: () => onClose() },
      );
    }
  }

  const isPending = create.isPending || patch.isPending;

  return (
    <Modal open={open} onClose={onClose} className="max-w-[640px]">
      <form onSubmit={submit} className="p-5 space-y-4">
        <div>
          <h3 className="text-[16px] font-bold text-[var(--color-fg-0)]">
            {editing ? "Editar plan" : "Crear plan"}
          </h3>
          <p className="text-[12px] text-[var(--color-fg-3)] mt-1">
            {form.isCustom
              ? "Plan para una organización específica. Reemplaza el plan general con el mismo slug."
              : "Plan general disponible para todas las organizaciones."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="slug">
            <Input
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              disabled={!!editing}
              required
              className="font-mono"
              placeholder="free / starter / pro"
            />
          </FormField>
          <FormField label="nombre visible">
            <Input
              value={form.displayName}
              onChange={(e) => set("displayName", e.target.value)}
              required
            />
          </FormField>
        </div>

        {form.isCustom && !editing && (
          <FormField
            label="ID de organización"
            hint="Puedes encontrarlo en Organización → Ver estado de la organización."
          >
            <Input
              type="number"
              min="1"
              value={form.organizationId}
              onChange={(e) => set("organizationId", e.target.value)}
              required
              placeholder="Ej. 12"
            />
          </FormField>
        )}

        <FormField label="mensajes incluidos por mes">
          <Input
            type="number"
            min="0"
            value={form.includedMessagesMonthly}
            onChange={(e) => set("includedMessagesMonthly", e.target.value)}
            required
          />
        </FormField>

        <FormField label="descripción">
          <Input
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="precio">
            <Input
              type="number"
              step="0.01"
              value={form.priceDollars}
              onChange={(e) => set("priceDollars", e.target.value)}
              required
            />
          </FormField>
          <FormField label="moneda">
            <Input
              value={form.currency}
              onChange={(e) =>
                set("currency", e.target.value.toUpperCase())
              }
              required
              maxLength={3}
              className="font-mono"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="máximo de proyectos">
            <Input
              type="number"
              value={form.maxPipelines}
              onChange={(e) => set("maxPipelines", e.target.value)}
              required
            />
          </FormField>
          <FormField label="máximo de réplicas por proyecto">
            <Input
              type="number"
              value={form.maxReplicasPerPipeline}
              onChange={(e) =>
                set("maxReplicasPerPipeline", e.target.value)
              }
              required
            />
          </FormField>
        </div>

        <div className="space-y-2 border border-[var(--color-border-subtle)] rounded-[3px] p-3">
          <div className="text-[10px] uppercase text-[var(--color-fg-4)] font-mono">
            Incluye
          </div>
          {[
            ["alertsEnabled", "alertas"],
            ["premiumConnectors", "conectores premium"],
            ["multiUser", "acceso para equipo"],
          ].map(([k, label]) => (
            <label
              key={k}
              className="flex items-center gap-2 text-[13px] font-mono"
            >
              <input
                type="checkbox"
                checked={(form as never as Record<string, boolean>)[k]}
                onChange={(e) =>
                  set(k as keyof PlanFormState, e.target.checked as never)
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <FormField label="ID de precio de Stripe (opcional)">
          <Input
            value={form.stripePriceId}
            onChange={(e) => set("stripePriceId", e.target.value)}
            placeholder="price_1ABC..."
            className="font-mono"
          />
        </FormField>

        {formError && (
          <p className="border border-[var(--color-danger)]/45 bg-[color-mix(in_srgb,var(--color-danger)_6%,var(--color-bg-panel))] px-3 py-2 text-[13px] text-[var(--color-danger)]" role="alert">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Guardando…" : editing ? "Guardar" : "Crear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
