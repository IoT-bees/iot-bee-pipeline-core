import type { PillState } from "@/components/ui/Pill";

function normalise(s?: string): string {
  return (s ?? "").toUpperCase();
}

export function toPillState(s?: string): PillState {
  const v = normalise(s);
  if (v === "RUNNING") return "running";
  if (v === "ERROR" || v === "FAILED" || v === "DEGRADED") return "error";
  if (v === "IDLE" || v === "STARTING" || v === "PENDING") return "starting";
  return "idle";
}

export function isRunning(s?: string): boolean {
  return normalise(s) === "RUNNING";
}

export function isError(s?: string): boolean {
  const v = normalise(s);
  return v === "ERROR" || v === "FAILED" || v === "DEGRADED";
}

export function canStop(s?: string): boolean {
  if (!s) return false;
  return normalise(s) !== "STOPPED";
}
