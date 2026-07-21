"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeDollarSign,
  Building2,
  ClipboardList,
  History,
  Mail,
  ServerCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { adminApi } from "@/lib/api/endpoints/admin";

type Item = { href: string; label: string; icon: LucideIcon; indent?: boolean };
const items: Item[] = [
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/audit", label: "Auditoría", icon: ClipboardList },
  { href: "/admin/system", label: "Sistema", icon: ServerCog },
  { href: "/admin/contact", label: "Contacto", icon: Mail },
  { href: "/admin/organization", label: "Organización", icon: Building2 },
  { href: "/admin/billing", label: "Planes", icon: BadgeDollarSign },
  { href: "/admin/billing/events", label: "Eventos", icon: History, indent: true },
];

export function AdminSidebar() {
  const path = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  function prefetchSection(href: string) {
    router.prefetch(href);

    if (href === "/admin/users") {
      void queryClient.prefetchQuery({
        queryKey: ["admin", "users", { limit: 50 }],
        queryFn: () => adminApi.listUsers({ limit: 50 }),
        staleTime: 60_000,
      });
    } else if (href === "/admin/system") {
      void queryClient.prefetchQuery({
        queryKey: ["admin", "system", "status"],
        queryFn: adminApi.systemStatus,
        staleTime: 10_000,
      });
    } else if (href === "/admin/organization") {
      void queryClient.prefetchQuery({
        queryKey: ["admin", "organization"],
        queryFn: adminApi.organization,
        staleTime: 60_000,
      });
    } else if (href === "/admin/billing") {
      void queryClient.prefetchQuery({
        queryKey: ["admin", "plans"],
        queryFn: adminApi.listPlans,
        staleTime: 60_000,
      });
    } else if (href === "/admin/billing/events") {
      void queryClient.prefetchQuery({
        queryKey: ["admin", "billing", "events", undefined],
        queryFn: () => adminApi.listBillingEvents({ limit: 50 }),
        staleTime: 60_000,
      });
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      items.forEach((item) => router.prefetch(item.href));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <aside className="w-full shrink-0 overflow-x-auto border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-nav)] font-mono md:w-[232px] md:border-b-0 md:border-r md:py-4">
      <div className="hidden px-5 pb-3 text-[11px] font-semibold uppercase text-[var(--color-fg-3)] md:block">
        Administración
      </div>
      <nav className="flex min-w-max md:block" aria-label="Administración">
        {items.map((it) => {
          const active = it.indent
            ? path === it.href || path?.startsWith(it.href + "/")
            : path?.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              onMouseEnter={() => prefetchSection(it.href)}
              onFocus={() => prefetchSection(it.href)}
              onTouchStart={() => prefetchSection(it.href)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 cursor-pointer border-b-2 transition-colors md:flex md:border-b-0 md:border-l-4",
                it.indent
                  ? "px-3 py-3 text-[13px] md:pl-11 md:pr-5 md:py-2.5"
                  : "px-4 py-3 text-[14px] md:px-5 md:py-3",
                active
                  ? "text-[var(--color-fg-0)] border-b-[var(--color-accent)] md:border-l-[var(--color-accent)] bg-[var(--color-bg-elev)]"
                  : "text-[var(--color-fg-2)] border-b-transparent md:border-l-transparent hover:bg-[var(--color-bg-elev)]",
              )}
              aria-current={active ? "page" : undefined}
            >
              <it.icon size={15} strokeWidth={1.8} aria-hidden="true" />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
