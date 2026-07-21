import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/Logo";
import { NavigationProgress } from "@/components/providers/NavigationProgress";
import { AdminSidebar } from "./AdminSidebar";

export function AdminShell({
  orgName,
  children,
}: {
  orgName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <NavigationProgress />
      <header className="bg-[var(--color-bg-nav)] border-b-2 border-[var(--color-accent)] px-4 py-3 sm:px-6 flex items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-3">
          <BrandMark size={24} />
          <span className="hidden text-[12px] text-[var(--color-fg-3)] sm:inline">
            Administración <span className="text-[var(--color-border-strong)]">/</span> {orgName}
          </span>
        </div>
        <Link
          href="/app"
          className="inline-flex min-h-10 items-center gap-1.5 text-[13px] border border-[var(--color-border-strong)] text-[var(--color-fg-1)] hover:border-[var(--color-accent)] px-3 rounded-[2px]"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Volver
        </Link>
      </header>
      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />
        <main className="flex-1 w-full max-w-[1360px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
