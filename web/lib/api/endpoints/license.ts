import { api } from "../client";
import type { ActivateLicenseRequest, LicenseStatus } from "../types";

export const licenseApi = {
  status: () => api<LicenseStatus>("/license/status"),
  activate: (body: ActivateLicenseRequest) =>
    api<LicenseStatus>("/license/activate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deactivate: () =>
    api<LicenseStatus>("/license/deactivate", { method: "POST" }),
};

