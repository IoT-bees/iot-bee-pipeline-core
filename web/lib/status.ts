import type { PillState } from "@/components/ui/Pill";

function normalise(s?: string): string {
  return (s ?? "").toUpperCase();
}

export function toPillState(s?: string): PillState {
  const v = normalise(s);
  if (v === "HEALTHY") return "running";
  if (v === "DEGRADED") return "error";
  if (v === "IDLE") return "idle";
  return "idle";
}

export function pipelineStatusLabel(s?: string): string {
  const v = normalise(s);
  if (v === "HEALTHY") return "OPERATIVO";
  if (v === "DEGRADED") return "CON INCIDENCIAS";
  if (v === "IDLE") return "EN ESPERA";
  return "DETENIDO";
}

export function isHealthy(s?: string): boolean {
  return normalise(s) === "HEALTHY";
}

export function isDegraded(s?: string): boolean {
  return normalise(s) === "DEGRADED";
}

export function canStop(s?: string): boolean {
  const v = normalise(s);
  return v === "HEALTHY" || v === "DEGRADED";
}

export function isActiveReplica(s?: string): boolean {
  return canStop(s);
}
