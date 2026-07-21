import {
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  Database,
  Rabbit,
} from "lucide-react";
import type { ComponentType } from "react";
import type { Dependency, SystemStatus } from "@/lib/api/types";
import { StatusCard } from "./StatusCard";

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

function dependencyPresentation(dependency: Dependency) {
  if (!dependency.configured) {
    return {
      label: "Sin configurar",
      tone: "neutral" as const,
      Icon: CircleDashed,
    };
  }

  if (dependency.ok) {
    return {
      label: "Conectado",
      tone: "success" as const,
      Icon: CheckCircle2,
    };
  }

  return {
    label: "No disponible",
    tone: "danger" as const,
    Icon: CircleAlert,
  };
}

const dependencyNames: Record<string, { label: string; Icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }> }> = {
  postgres: { label: "PostgreSQL", Icon: Database },
  rabbitmq: { label: "RabbitMQ", Icon: Rabbit },
};

function DependencyRow({ dependency }: { dependency: Dependency }) {
  const presentation = dependencyPresentation(dependency);
  const { label, Icon } = dependencyNames[dependency.name] ?? {
    label: dependency.name,
    Icon: CircleDashed,
  };
  const StatusIcon = presentation.Icon;

  return (
    <div
      className="flex items-center justify-between gap-4 rounded-md border border-[var(--color-border-subtle)] px-4 py-3"
      title={dependency.configured && !dependency.ok ? dependency.error ?? undefined : undefined}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon size={20} aria-hidden />
        <span className="text-base font-medium text-[var(--color-fg-0)]">{label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {dependency.latencyMs != null && (
          <span className="text-sm text-[var(--color-fg-3)]">{dependency.latencyMs} ms</span>
        )}
        <span
          aria-label={presentation.label}
          className={
            presentation.tone === "success"
              ? "text-[var(--color-online)]"
              : presentation.tone === "danger"
                ? "text-[var(--color-danger)]"
                : "text-[var(--color-fg-3)]"
          }
        >
          <StatusIcon size={19} aria-hidden />
        </span>
        <span className="text-sm font-medium">{presentation.label}</span>
      </div>
    </div>
  );
}

function Metric({ label, value, muted = false }: { label: string; value: string | number; muted?: boolean }) {
  return (
    <div>
      <dt className="text-sm text-[var(--color-fg-3)]">{label}</dt>
      <dd className={muted ? "mt-1 text-lg text-[var(--color-fg-4)]" : "mt-1 text-2xl font-semibold text-[var(--color-fg-0)]"}>
        {value}
      </dd>
    </div>
  );
}

export function StatusGrid({ status }: { status: SystemStatus }) {
  const unavailableDependencies = status.dependencies.filter((dependency) => dependency.configured && !dependency.ok);
  const unconfiguredDependencies = status.dependencies.filter((dependency) => !dependency.configured);
  const systemTone = unavailableDependencies.length > 0 ? "danger" : unconfiguredDependencies.length > 0 ? "warning" : "success";
  const systemLabel = unavailableDependencies.length > 0 ? "Atención requerida" : unconfiguredDependencies.length > 0 ? "Configuración pendiente" : "Sistema operativo";
  const SystemIcon = systemTone === "success" ? CheckCircle2 : systemTone === "warning" ? CircleDashed : CircleAlert;
  const systemColor = systemTone === "success" ? "text-[var(--color-online)]" : systemTone === "warning" ? "text-amber-500" : "text-[var(--color-danger)]";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-5 py-4">
        <span className="text-lg font-semibold text-[var(--color-fg-0)]">{systemLabel}</span>
        <span className={`flex items-center gap-2 text-sm font-medium ${systemColor}`}>
          <SystemIcon size={19} aria-hidden />
          {status.dependencies.filter((dependency) => dependency.ok).length}/{status.dependencies.length} conectadas
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusCard title="Dependencias" tone={systemTone} className="lg:col-span-2">
          <div className="grid gap-3 md:grid-cols-2">
            {status.dependencies.map((dependency) => (
              <DependencyRow key={dependency.name} dependency={dependency} />
            ))}
          </div>
        </StatusCard>

        <StatusCard title="Operación">
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Metric label="Proyectos configurados" value={status.runtime.configuredPipelines} />
            <Metric label="Réplicas configuradas" value={status.runtime.liveReplicas ?? "—"} muted={status.runtime.liveReplicas == null} />
            <Metric label="Mensajes recibidos (última hora)" value={status.runtime.msgsLastHour ?? "Sin datos"} muted={status.runtime.msgsLastHour == null} />
          </dl>
        </StatusCard>

        <StatusCard title="Aplicación">
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Metric label="Versión" value={status.build.commit === "unknown" ? "Sin datos" : status.build.commit.substring(0, 12)} muted={status.build.commit === "unknown"} />
            {status.build.buildTime !== "unknown" && <Metric label="Compilado" value={status.build.buildTime} />}
            <Metric label="Tiempo activo" value={formatUptime(status.build.uptimeSeconds)} />
            <Metric label="Última verificación" value={new Date(status.probedAt).toLocaleTimeString()} />
          </dl>
        </StatusCard>
      </div>
    </div>
  );
}
