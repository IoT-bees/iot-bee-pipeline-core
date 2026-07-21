import { redirect } from "next/navigation";
import { getToken } from "@/lib/auth/session";
import { apiAuthed } from "@/lib/api/server";
import { getAdminOrganization } from "@/lib/api/adminServer";
import type { MeResponse, Organization } from "@/lib/api/types";
import { AdminShell } from "@/components/admin/AdminShell";
import { QueryProvider } from "@/components/providers/QueryProvider";

export default async function AdminLayoutGroup({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getToken();
  if (!token) redirect("/login");

  let me: MeResponse;
  try {
    me = await apiAuthed<MeResponse>("/auth/me");
  } catch {
    redirect("/login");
  }
  if (me.user.role !== "admin") redirect("/app");

  let org: Organization | null = null;
  try {
    org = await getAdminOrganization();
  } catch {
    // La navegación sigue disponible aunque el nombre contextual no se pueda cargar.
  }

  return (
    <QueryProvider>
      <AdminShell orgName={org?.name ?? "Organización no disponible"}>{children}</AdminShell>
    </QueryProvider>
  );
}
