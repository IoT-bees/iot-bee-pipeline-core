"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items = [
  { href: "/admin/users", label: "users" },
  { href: "/admin/audit", label: "audit" },
  { href: "/admin/system", label: "system" },
  { href: "/admin/organization", label: "organization" },
  { href: "/admin/billing", label: "billing" },
];

export function AdminSidebar() {
  const path = usePathname();
  return (
    <aside className="w-[200px] shrink-0 border-r border-[#1f1f1f] bg-[#050505] font-mono py-3">
      <div className="px-4 pb-2 text-[10px] tracking-[2px] uppercase text-[var(--color-fg-4)]">
        {"// "}admin
      </div>
      {items.map((it) => {
        const active = path?.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "block px-4 py-3 text-[14px] border-l-4 transition-colors",
              active
                ? "text-[var(--color-fg-0)] border-l-[var(--color-accent)] bg-[var(--color-bg-elev)]"
                : "text-[var(--color-fg-2)] border-l-transparent hover:bg-[var(--color-bg-elev)]",
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </aside>
  );
}
