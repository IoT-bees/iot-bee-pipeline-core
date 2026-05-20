import { redirect } from "next/navigation";
import { getToken } from "@/lib/auth/session";
import { apiAuthed } from "@/lib/api/server";
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
    org = await apiAuthed<Organization>("/admin/organization");
  } catch {
    // fall through with placeholder org name
  }

  return (
    <QueryProvider>
      <AdminShell orgName={org?.name ?? "—"}>{children}</AdminShell>
    </QueryProvider>
  );
}
