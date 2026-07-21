import { api } from "../client";
import type { Plan, PlanListResponse } from "../types";

export const plansApi = {
  list: () => api<PlanListResponse>("/plans"),
};

export type { Plan };
