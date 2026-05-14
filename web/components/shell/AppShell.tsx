import { TopNav } from "./TopNav";
import { CommandBar } from "./CommandBar";
import { Footer } from "./Footer";
import { ToastProvider } from "@/components/providers/ToastProvider";
import type { UserResponse } from "@/lib/api/types";

export function AppShell({
  user,
  children,
}: {
  user: UserResponse;
  children: React.ReactNode;
}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav user={user} apiUrl={apiUrl} />
      <CommandBar />
      <main className="flex-1 px-4 sm:px-6 py-6 max-w-[1280px] w-full mx-auto">
        {children}
      </main>
      <Footer apiUrl={apiUrl} />
      <ToastProvider />
    </div>
  );
}
