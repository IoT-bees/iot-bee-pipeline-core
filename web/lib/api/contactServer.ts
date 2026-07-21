import "server-only";
import { backendApi, apiAuthed } from "@/lib/api/server";
import type { ContactSettings } from "@/lib/api/types";

const fallback: ContactSettings = {
  contactEmail: "info@ovidioandrade.com",
  whatsappNumber: null,
};

export async function getPublicContactSettings(): Promise<ContactSettings> {
  try {
    return await backendApi<ContactSettings>("/contact-settings");
  } catch {
    return fallback;
  }
}

export function getAdminContactSettings(): Promise<ContactSettings> {
  return apiAuthed<ContactSettings>("/admin/system/contact-settings");
}
