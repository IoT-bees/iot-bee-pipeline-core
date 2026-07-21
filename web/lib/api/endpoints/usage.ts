import { api } from "../client";
import type { UsageStatus } from "../types";

export const usageApi = {
  current: () => api<UsageStatus>("/usage"),
  pipelines: () => api<UsageStatus[]>("/usage/pipelines"),
};
