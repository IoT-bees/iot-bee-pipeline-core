import { TopNav } from "./TopNav";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { NavigationProgress } from "@/components/providers/NavigationProgress";
import type { UserResponse } from "@/lib/api/types";

export function AppShell({
  user,
  children,
}: {
  user: UserResponse;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <NavigationProgress />
      <TopNav user={user} />
      <main className="flex-1 px-4 sm:px-6 py-6 max-w-[1280px] w-full mx-auto">
        {children}
      </main>
      <ToastProvider />
    </div>
  );
}
