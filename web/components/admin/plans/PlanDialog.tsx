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
  organizationId: string;
  displayName: string;
  description: string;
  priceDollars: string;
  currency: string;
  maxPipelines: string;
  maxReplicasPerPipeline: string;
  alertsEnabled: boolean;
  premiumConnectors: boolean;
  multiUser: boolean;
  isCustom: boolean;
  stripePriceId: string;
}

const empty: PlanFormState = {
  slug: "",
  organizationId: "",
  displayName: "",
  description: "",
  priceDollars: "0",
  currency: "USD",
  maxPipelines: "10",
  maxReplicasPerPipeline: "4",
  alertsEnabled: false,
  premiumConnectors: false,
  multiUser: false,
  isCustom: false,
  stripePriceId: "",
};

function planToForm(p: Plan): PlanFormState {
  return {
    slug: p.slug,
    organizationId: p.organizationId?.toString() ?? "",
    displayName: p.displayName,
    description: p.description ?? "",
    priceDollars: (p.priceCents / 100).toFixed(2),
    currency: p.currency,
    maxPipelines: p.maxPipelines.toString(),
    maxReplicasPerPipeline: p.maxReplicasPerPipeline.toString(),
    alertsEnabled: p.alertsEnabled,
    premiumConnectors: p.premiumConnectors,
    multiUser: p.multiUser,
    isCustom: p.isCustom,
    stripePriceId: p.stripePriceId ?? "",
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
  }, [editing?.id, defaultIsCustom, open]);

  function set<K extends keyof PlanFormState>(k: K, v: PlanFormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(form.priceDollars || "0") * 100);
    const maxPipelines = parseInt(form.maxPipelines, 10);
    const maxReplicas = parseInt(form.maxReplicasPerPipeline, 10);
    const orgId = form.organizationId.trim()
      ? parseInt(form.organizationId.trim(), 10)
      : null;

    if (editing) {
      patch.mutate(
        {
          displayName: form.displayName,
          description: form.description || null,
          priceCents,
          currency: form.currency.toUpperCase(),
          maxPipelines,
          maxReplicasPerPipeline: maxReplicas,
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
          organizationId: orgId,
          displayName: form.displayName,
          description: form.description || null,
          priceCents,
          currency: form.currency.toUpperCase(),
          maxPipelines,
          maxReplicasPerPipeline: maxReplicas,
          alertsEnabled: form.alertsEnabled,
          premiumConnectors: form.premiumConnectors,
          multiUser: form.multiUser,
          isCustom: form.isCustom || orgId !== null,
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
            {editing ? "Edit plan" : "Create plan"}
          </h3>
          <p className="text-[12px] text-[var(--color-fg-3)] mt-1">
            {form.isCustom || form.organizationId
              ? "Custom plan for a single organization — overrides the global plan with the same slug."
              : "Global plan visible to every organization."}
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
          <FormField label="display name">
            <Input
              value={form.displayName}
              onChange={(e) => set("displayName", e.target.value)}
              required
            />
          </FormField>
        </div>

        <FormField label="description">
          <Input
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-3 gap-3">
          <FormField label="price">
            <Input
              type="number"
              step="0.01"
              value={form.priceDollars}
              onChange={(e) => set("priceDollars", e.target.value)}
              required
            />
          </FormField>
          <FormField label="currency">
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
          <FormField label="organization id (custom)">
            <Input
              value={form.organizationId}
              onChange={(e) => set("organizationId", e.target.value)}
              placeholder="empty = global"
              disabled={!!editing}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="max pipelines">
            <Input
              type="number"
              value={form.maxPipelines}
              onChange={(e) => set("maxPipelines", e.target.value)}
              required
            />
          </FormField>
          <FormField label="max replicas / pipeline">
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

        <div className="space-y-2 border border-[#1f1f1f] rounded-[3px] p-3">
          <div className="text-[10px] tracking-[2px] uppercase text-[var(--color-fg-4)] font-mono">
            features
          </div>
          {[
            ["alertsEnabled", "alerts"],
            ["premiumConnectors", "premium connectors"],
            ["multiUser", "multi-user"],
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

        <FormField label="stripe price id (optional)">
          <Input
            value={form.stripePriceId}
            onChange={(e) => set("stripePriceId", e.target.value)}
            placeholder="price_1ABC..."
            className="font-mono"
          />
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Saving…" : editing ? "Save" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
