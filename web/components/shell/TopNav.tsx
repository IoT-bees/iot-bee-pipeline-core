"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { UserResponse } from "@/lib/api/types";
import { BrandMark } from "@/components/Logo";

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-block text-[10px] tracking-[1.5px] uppercase border border-[var(--color-accent)] text-[var(--color-accent)] px-2 py-[2px] rounded-[2px]">
      role · {role}
    </span>
  );
}

const tabs = [
  { href: "/app", label: "overview" },
  { href: "/pipelines", label: "pipelines" },
  { href: "/sources", label: "sources" },
  { href: "/stores", label: "stores" },
  { href: "/schemas", label: "schemas" },
  { href: "/groups", label: "groups" },
];

interface Props {
  user: UserResponse;
  apiUrl: string;
}

export function TopNav({ user, apiUrl }: Props) {
  const path = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDrawerOpen(false);
    setUserMenuOpen(false);
  }, [path]);

  useEffect(() => {
    if (!userMenuOpen) return;
    function onDoc(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [userMenuOpen]);

  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const initial = (user.name || user.email).charAt(0).toUpperCase();

  return (
    <>
      <div className="hidden md:flex bg-[#050505] border-b border-[var(--color-accent)] px-5 py-3 items-center gap-6 text-[14px] font-mono">
        <Link href="/app" className="whitespace-nowrap">
          <BrandMark size={26} />
        </Link>
        <nav className="flex gap-5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "text-[var(--color-fg-3)] hover:text-[var(--color-fg-1)] whitespace-nowrap pb-[3px] transition-colors",
                path?.startsWith(t.href) &&
                  "text-[var(--color-fg-0)] border-b-2 border-[var(--color-accent)]",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 whitespace-nowrap">
          <span
            title={`Backend API connected · ${apiUrl}`}
            className="hidden lg:inline-flex items-center gap-1.5 text-[12px] text-[var(--color-fg-3)] border border-[#1f1f1f] px-2.5 py-1 rounded-[2px]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
            Backend
            <span className="text-[var(--color-accent)] uppercase tracking-[1.5px] text-[10px]">
              online
            </span>
          </span>
          <span
            title={`Backend API connected · ${apiUrl}`}
            className="lg:hidden inline-flex items-center text-[var(--color-accent)] text-[14px]"
          >
            ●
          </span>

          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              title={`Signed in as ${user.email}`}
              className={cn(
                "inline-flex items-center gap-2 border px-2.5 py-1 rounded-[2px] text-[13px] transition-colors",
                userMenuOpen
                  ? "border-[var(--color-accent)] text-[var(--color-fg-0)]"
                  : "border-[#333] text-[var(--color-fg-1)] hover:border-[var(--color-accent)]",
              )}
            >
              <span className="w-5 h-5 inline-flex items-center justify-center bg-[var(--color-accent)] text-[var(--color-bg-base)] font-bold text-[11px] rounded-[2px]">
                {initial}
              </span>
              <span className="font-medium">{user.name}</span>
              <span className="text-[var(--color-fg-4)] text-[11px]">▾</span>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-[280px] bg-[var(--color-bg-panel)] border border-[var(--color-accent)] rounded-[3px] shadow-lg z-40 font-mono">
                <div className="px-4 py-3 border-b border-[#1f1f1f]">
                  <div className="text-[10px] tracking-[2px] uppercase text-[var(--color-fg-4)] mb-1">
                    {"// "}signed in as
                  </div>
                  <div className="text-[14px] text-[var(--color-fg-0)] font-medium break-all">
                    {user.name}
                  </div>
                  <div className="text-[12px] text-[var(--color-fg-3)] break-all mt-0.5">
                    {user.email}
                  </div>
                  <div className="mt-2">
                    <RoleBadge role={user.role} />
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="block w-full text-left px-4 py-3 text-[13px] text-[var(--color-danger)] hover:bg-[var(--color-bg-elev)] transition-colors"
                >
                  ↪ Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="md:hidden bg-[#050505] border-b border-[var(--color-accent)] px-4 py-3 flex items-center justify-between text-[14px] font-mono">
        <Link href="/app">
          <BrandMark size={24} />
        </Link>
        <div className="flex items-center gap-3">
          <span
            title={`Backend API connected · ${apiUrl}`}
            className="text-[var(--color-accent)] text-[14px]"
          >
            ●
          </span>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="open menu"
            className="text-[var(--color-fg-1)] border border-[#333] px-3 py-1.5 rounded-[2px] text-[13px] font-bold tracking-[1px]"
          >
            MENU
          </button>
        </div>
      </div>

      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-[var(--color-bg-base)]">
          <div className="bg-[#050505] border-b border-[var(--color-accent)] px-4 py-3 flex items-center justify-between">
            <Link href="/app" onClick={() => setDrawerOpen(false)}>
              <BrandMark size={24} />
            </Link>
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="close menu"
              className="text-[var(--color-fg-1)] text-[22px] leading-none px-3 py-1"
            >
              ×
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            <div className="px-4 pb-2 text-[11px] tracking-[2px] uppercase text-[var(--color-fg-4)] font-mono">
              {"// "}navigate
            </div>
            {tabs.map((t) => {
              const active = path?.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    "block px-4 py-4 text-[18px] font-mono border-l-4 transition-colors",
                    active
                      ? "text-[var(--color-fg-0)] border-l-[var(--color-accent)] bg-[var(--color-bg-elev)]"
                      : "text-[var(--color-fg-2)] border-l-transparent hover:bg-[var(--color-bg-elev)]",
                  )}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[#1f1f1f] px-4 py-4 font-mono">
            <div className="text-[11px] tracking-[2px] uppercase text-[var(--color-fg-4)] mb-2">
              {"// "}signed in as
            </div>
            <div className="flex items-center gap-3 mb-1">
              <span className="w-7 h-7 inline-flex items-center justify-center bg-[var(--color-accent)] text-[var(--color-bg-base)] font-bold text-[14px] rounded-[2px]">
                {initial}
              </span>
              <div className="min-w-0">
                <div className="text-[15px] text-[var(--color-fg-0)] truncate">
                  {user.name}
                </div>
                <div className="text-[12px] text-[var(--color-fg-3)] truncate">
                  {user.email}
                </div>
              </div>
            </div>
            <div className="mb-3">
              <RoleBadge role={user.role} />
            </div>
            <div className="text-[11px] tracking-[2px] uppercase text-[var(--color-fg-4)] mb-2">
              {"// "}backend
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[var(--color-fg-3)] mb-4">
              <span className="text-[var(--color-accent)]">●</span>
              <span className="text-[var(--color-accent)] uppercase tracking-[1.5px]">
                online
              </span>
              <span className="break-all">· {apiUrl}</span>
            </div>
            <button
              onClick={logout}
              className="block w-full text-center text-[14px] border border-[var(--color-danger)] text-[var(--color-danger)] px-4 py-3 rounded-[2px] font-bold"
            >
              ↪ Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
