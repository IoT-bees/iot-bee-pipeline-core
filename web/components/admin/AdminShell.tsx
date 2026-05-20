import Link from "next/link";
import { BrandMark } from "@/components/Logo";
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
      <header className="bg-[#050505] border-b border-[var(--color-accent)] px-5 py-3 flex items-center justify-between font-mono">
        <div className="flex items-center gap-3">
          <BrandMark size={24} />
          <span className="text-[12px] uppercase tracking-[2px] text-[var(--color-fg-3)]">
            admin · org={orgName}
          </span>
        </div>
        <Link
          href="/app"
          className="text-[13px] border border-[#333] text-[var(--color-fg-1)] hover:border-[var(--color-accent)] px-3 py-1.5 rounded-[2px]"
        >
          ← back to app
        </Link>
      </header>
      <div className="flex-1 flex">
        <AdminSidebar />
        <main className="flex-1 p-6 max-w-[1280px] w-full">{children}</main>
      </div>
    </div>
  );
}
