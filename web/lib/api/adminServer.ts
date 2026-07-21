import "server-only";
import { cache } from "react";
import { apiAuthed } from "@/lib/api/server";
import type { Organization } from "@/lib/api/types";

// React deduplica esta lectura dentro del mismo render de servidor. El layout
// y la página de organización comparten el resultado sin poner datos de una
// sesión en una caché global.
export const getAdminOrganization = cache(() =>
  apiAuthed<Organization>("/admin/organization"),
);
