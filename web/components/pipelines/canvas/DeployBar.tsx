"use client";

import { Check, Rocket } from "lucide-react";

interface Props {
  name: string;
  replicas: number;
  blockedReason: string | null;
  onNameChange: (v: string) => void;
  onReplicasChange: (v: number) => void;
  onDeploy: () => void;
  deploying: boolean;
}

export function DeployBar({
  name,
  replicas,
  blockedReason,
  onNameChange,
  onReplicasChange,
  onDeploy,
  deploying,
}: Props) {
  const disabled = deploying || blockedReason !== null;
  return (
    <section aria-labelledby="deploy-title" className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-4 py-4 md:px-6">
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(190px,0.8fr)_minmax(260px,1.45fr)_120px_auto]">
        <div className="flex items-start gap-3 pb-1 lg:pb-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[rgba(255,179,0,0.12)] text-[var(--color-accent-strong)] text-[13px] font-bold" aria-hidden="true">3</span>
          <div>
            <h2 id="deploy-title" className="text-[13px] font-semibold text-[var(--color-fg-1)]">Dale un nombre y crea el pipeline</h2>
            <p className="mt-0.5 text-[11px] leading-4 text-[var(--color-fg-4)]">Quedará en el grupo predeterminado y podrás editarlo después.</p>
          </div>
        </div>
        <Field label="Nombre" className="min-w-0">
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="frio-cliente-a"
          maxLength={30}
          aria-label="Nombre"
          aria-describedby="pipeline-name-count"
          aria-invalid={blockedReason?.includes("nombre") || undefined}
          className="w-full min-w-0 rounded-[3px] border border-[var(--color-border)] bg-[var(--color-bg-base)] px-3 py-2 text-[13px] text-[var(--color-fg-2)]"
        />
        <span id="pipeline-name-count" className="text-right text-[10px] text-[var(--color-fg-4)]">{name.length}/30 caracteres</span>
        </Field>
      <Field label="Réplicas">
        <input
          type="number"
          min={1}
          max={64}
          value={replicas}
          onChange={(e) => onReplicasChange(parseInt(e.target.value, 10) || 0)}
          aria-label="Réplicas"
          aria-invalid={blockedReason?.includes("réplica") || undefined}
          className="w-full rounded-[3px] border border-[var(--color-border)] bg-[var(--color-bg-base)] px-3 py-2 text-[13px] text-[var(--color-fg-2)]"
        />
      </Field>
      <button
        type="button"
        data-deploy-cta
        disabled={disabled}
        onClick={onDeploy}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[3px] bg-[var(--color-accent)] px-4 py-2.5 text-[12px] font-bold text-[var(--landing-accent-ink)] disabled:cursor-not-allowed disabled:opacity-40 lg:mt-[23px]"
      >
        {deploying ? <LoaderLabel /> : <><Rocket size={15} aria-hidden="true" /> Crear proyecto</>}
      </button>
        <span
          role="status"
          aria-live="polite"
          className={`flex items-center gap-1.5 text-[11px] lg:col-span-4 ${
            blockedReason ? "text-[var(--color-fg-3)]" : "text-[var(--color-online)]"
          }`}
        >
          {!blockedReason && <Check size={14} aria-hidden="true" />}
          {blockedReason ? `Pendiente: ${blockedReason}` : "Todo listo para crear"}
        </span>
      </div>
    </section>
  );
}

function LoaderLabel() {
  return <>Creando proyecto...</>;
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-[11px] font-medium text-[var(--color-fg-4)]">{label}</span>
      {children}
    </label>
  );
}
