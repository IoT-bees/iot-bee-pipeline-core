import { redirect } from "next/navigation";
import { getToken } from "@/lib/auth/session";
import { apiAuthed } from "@/lib/api/server";
import type { MeResponse } from "@/lib/api/types";
import { AppShell } from "@/components/shell/AppShell";
import { QueryProvider } from "@/components/providers/QueryProvider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const token = await getToken();
  if (!token) redirect("/login");

  let me: MeResponse;
  try {
    me = await apiAuthed<MeResponse>("/auth/me");
  } catch {
    redirect("/login");
  }

  return (
    <QueryProvider>
      <AppShell user={me.user}>{children}</AppShell>
    </QueryProvider>
  );
}
