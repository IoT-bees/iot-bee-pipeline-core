import { api } from "../client";
import type {
  AdminUser,
  AdminUsersListResponse,
  AuditFilters,
  AuditListResponse,
  BillingEvent,
  BillingEventsListResponse,
  CreateAdminUserRequest,
  CreatePlanRequest,
  Organization,
  OrgStateResponse,
  PatchAdminUserRequest,
  PatchOrganizationRequest,
  PatchPlanRequest,
  Plan,
  PlanListResponse,
  SystemStatus,
} from "../types";

function qs(f: AuditFilters): string {
  const p = new URLSearchParams();
  if (f.userId != null) p.set("user_id", String(f.userId));
  if (f.method) p.set("method", f.method);
  if (f.pathContains) p.set("path_contains", f.pathContains);
  if (f.status != null) p.set("status", String(f.status));
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.cursor != null) p.set("cursor", String(f.cursor));
  if (f.limit != null) p.set("limit", String(f.limit));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const adminApi = {
  listAudit: (f: AuditFilters = {}) =>
    api<AuditListResponse>(`/admin/audit${qs(f)}`),
  systemStatus: () => api<SystemStatus>("/admin/system/status"),
  listUsers: () => api<AdminUsersListResponse>("/admin/users"),
  createUser: (b: CreateAdminUserRequest) =>
    api<AdminUser>("/admin/users", { method: "POST", body: JSON.stringify(b) }),
  patchUser: (id: number, b: PatchAdminUserRequest) =>
    api<AdminUser>(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(b),
    }),
  deactivateUser: (id: number) =>
    api<void>(`/admin/users/${id}`, { method: "DELETE" }),
  organization: () => api<Organization>("/admin/organization"),
  patchOrganization: (b: PatchOrganizationRequest) =>
    api<Organization>("/admin/organization", {
      method: "PATCH",
      body: JSON.stringify(b),
    }),
  listPlans: () => api<PlanListResponse>("/admin/plans"),
  createPlan: (b: CreatePlanRequest) =>
    api<Plan>("/admin/plans", { method: "POST", body: JSON.stringify(b) }),
  patchPlan: (id: number, b: PatchPlanRequest) =>
    api<Plan>(`/admin/plans/${id}`, {
      method: "PATCH",
      body: JSON.stringify(b),
    }),
  deletePlan: (id: number) =>
    api<void>(`/admin/plans/${id}`, { method: "DELETE" }),
  listBillingEvents: (limit: number = 50) =>
    api<BillingEventsListResponse>(`/admin/billing/events?limit=${limit}`),
  retryBillingEvent: (id: number) =>
    api<BillingEvent>(`/admin/billing/events/${id}/retry`, { method: "POST" }),
  orgState: (id: number) => api<OrgStateResponse>(`/admin/orgs/${id}/state`),
};
