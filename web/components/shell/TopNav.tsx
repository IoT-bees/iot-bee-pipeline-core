"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CircleCheck,
  ChevronDown,
  CircleHelp,
  CircleX,
  CreditCard,
  LoaderCircle,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { UserResponse } from "@/lib/api/types";
import { groupsApi } from "@/lib/api/endpoints/groups";
import { pipelinesApi } from "@/lib/api/endpoints/pipelines";
import { schemasApi } from "@/lib/api/endpoints/schemas";
import { sourcesApi } from "@/lib/api/endpoints/sources";
import { storesApi } from "@/lib/api/endpoints/stores";
import { BrandMark } from "@/components/Logo";
import { useAppTheme } from "@/components/landing/LandingThemeProvider";
import { useApiHealth } from "@/lib/hooks/useApiHealth";
import { useLicenseStatus } from "@/lib/hooks/useLicense";

const tabs = [
  { href: "/app", label: "inicio" },
  { href: "/pipelines", label: "proyectos" },
  { href: "/sources", label: "brokers" },
  { href: "/stores", label: "destinos" },
  { href: "/schemas", label: "reglas de datos" },
  { href: "/groups", label: "organizar" },
];

interface Props {
  user: UserResponse;
}

function ApiHealthIndicator({ health }: { health: ReturnType<typeof useApiHealth> }) {
  if (health.isError) {
    return (
      <span
        role="status"
        aria-live="polite"
        title="La última comprobación de /health no pudo llegar al backend o la base de datos no respondió."
        className="inline-flex items-center gap-1.5 text-[var(--color-danger)]"
      >
        <CircleX size={14} aria-hidden="true" />
        <span className="uppercase">API no disponible</span>
      </span>
    );
  }

  if (health.data?.status === "ok") {
    return (
      <span
        role="status"
        aria-live="polite"
        title="Comprobación real de /health: el backend y su conexión a la base de datos respondieron correctamente."
        className="inline-flex items-center gap-1.5 text-[var(--color-online)]"
      >
        <CircleCheck size={14} aria-hidden="true" />
        <span className="uppercase">API disponible</span>
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 text-[var(--color-fg-3)]"
    >
      <LoaderCircle size={14} aria-hidden="true" className="animate-spin" />
      <span className="uppercase">Comprobando API</span>
    </span>
  );
}

export function TopNav({ user }: Props) {
  const path = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useAppTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const apiHealth = useApiHealth(userMenuOpen || drawerOpen);
  const licenseStatus = useLicenseStatus(userMenuOpen || drawerOpen);
  const activePlanLabel = licenseStatus.data
    ? `Plan activo: ${licenseStatus.data.plan.toUpperCase()}`
    : licenseStatus.isPending
      ? "Cargando plan…"
      : "Ver mi plan";

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

  function toggleUserMenu() {
    const willOpen = !userMenuOpen;
    setUserMenuOpen(willOpen);
    if (willOpen && user.role === "admin") router.prefetch("/admin");
  }

  function prefetchSection(href: string) {
    router.prefetch(href);

    if (href === "/pipelines") {
      void queryClient.prefetchQuery({
        queryKey: ["pipelines", "list"],
        queryFn: pipelinesApi.list,
        staleTime: 15_000,
      });
    } else if (href === "/sources") {
      void queryClient.prefetchQuery({
        queryKey: ["sources"],
        queryFn: sourcesApi.list,
        staleTime: 30_000,
      });
    } else if (href === "/stores") {
      void queryClient.prefetchQuery({
        queryKey: ["stores"],
        queryFn: storesApi.list,
        staleTime: 30_000,
      });
    } else if (href === "/schemas") {
      void queryClient.prefetchQuery({
        queryKey: ["schemas"],
        queryFn: schemasApi.list,
        staleTime: 30_000,
      });
    } else if (href === "/groups") {
      void queryClient.prefetchQuery({
        queryKey: ["groups"],
        queryFn: groupsApi.list,
        staleTime: 30_000,
      });
    }
  }

  const initial = (user.name || user.email).charAt(0).toUpperCase();

  return (
    <>
      <div className="hidden md:flex bg-[var(--color-bg-nav)] border-b border-[var(--color-accent)] px-5 py-3 items-center gap-6 text-[14px] font-mono">
        <Link href="/app" className="whitespace-nowrap">
          <BrandMark size={26} />
        </Link>
        <nav className="flex gap-5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              onMouseEnter={() => prefetchSection(t.href)}
              onFocus={() => prefetchSection(t.href)}
              className={cn(
                "cursor-pointer text-[var(--color-fg-3)] hover:text-[var(--color-fg-1)] whitespace-nowrap pb-[3px] transition-colors",
                path?.startsWith(t.href) &&
                  "text-[var(--color-fg-0)] border-b-2 border-[var(--color-accent)]",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 whitespace-nowrap">
          <div ref={userMenuRef} className="relative">
            <button
              onClick={toggleUserMenu}
              title={`Sesión iniciada como ${user.email}`}
              className={cn(
                "inline-flex items-center gap-2 border px-2.5 py-1 rounded-[2px] text-[13px] transition-colors",
                userMenuOpen
                  ? "border-[var(--color-accent)] text-[var(--color-fg-0)]"
                  : "border-[var(--color-border-strong)] text-[var(--color-fg-1)] hover:border-[var(--color-accent)]",
              )}
            >
              <span className="w-5 h-5 inline-flex items-center justify-center bg-[var(--color-accent)] text-[var(--landing-accent-ink)] font-bold text-[11px] rounded-[2px]">
                {initial}
              </span>
              <span className="font-medium">{user.name}</span>
              <ChevronDown
                size={15}
                aria-hidden="true"
                className={cn(
                  "text-[var(--color-fg-4)] transition-transform duration-150",
                  userMenuOpen && "rotate-180",
                )}
              />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-[280px] bg-[var(--color-bg-panel)] border border-[var(--color-accent)] rounded-[3px] shadow-lg z-40 font-mono">
                <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
                  <div className="text-[10px] uppercase text-[var(--color-fg-4)] mb-1">
                    Sesión iniciada
                  </div>
                  <div className="text-[14px] text-[var(--color-fg-0)] font-medium break-all">
                    {user.name}
                  </div>
                  <div className="text-[12px] text-[var(--color-fg-3)] break-all mt-0.5">
                    {user.email}
                  </div>
                </div>
                <div className="flex min-h-11 items-center gap-x-3 border-b border-[var(--color-border-subtle)] px-4 text-[11px]">
                  <span className="uppercase text-[var(--color-fg-4)]">
                    Rol: <span className="font-medium text-[var(--color-fg-0)]">{user.role}</span>
                  </span>
                  <span className="h-3 border-l border-[var(--color-border)]" aria-hidden="true" />
                  <ApiHealthIndicator health={apiHealth} />
                </div>
                <div className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-4">
                  <span className="text-[10px] uppercase text-[var(--color-fg-4)]">Apariencia</span>
                  <div className="flex overflow-hidden rounded-[2px] border border-[var(--color-border)]" role="group" aria-label="Cambiar apariencia">
                    <button
                      type="button"
                      title="Vista clara"
                      aria-label="Vista clara"
                      aria-pressed={theme === "light"}
                      onClick={() => setTheme("light")}
                      className={`grid h-7 w-8 place-items-center transition-colors ${theme === "light" ? "bg-[var(--color-accent)] text-[var(--landing-accent-ink)]" : "text-[var(--color-fg-3)] hover:text-[var(--color-fg-0)]"}`}
                    >
                      <Sun size={15} />
                    </button>
                    <button
                      type="button"
                      title="Vista oscura"
                      aria-label="Vista oscura"
                      aria-pressed={theme === "dark"}
                      onClick={() => setTheme("dark")}
                      className={`grid h-7 w-8 place-items-center border-l border-[var(--color-border)] transition-colors ${theme === "dark" ? "bg-[var(--color-accent)] text-[var(--landing-accent-ink)]" : "text-[var(--color-fg-3)] hover:text-[var(--color-fg-0)]"}`}
                    >
                      <Moon size={15} />
                    </button>
                  </div>
                </div>
                <Link
                  href="/billing"
                  className="flex min-h-11 items-center gap-2 border-b border-[var(--color-border-subtle)] px-4 text-[13px] text-[var(--color-fg-1)] transition-colors hover:bg-[var(--color-bg-elev)]"
                >
                  <CreditCard size={16} aria-hidden="true" />
                  {activePlanLabel}
                </Link>
                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    onMouseEnter={() => router.prefetch("/admin")}
                    onFocus={() => router.prefetch("/admin")}
                    className="flex min-h-11 items-center gap-2 border-b border-[var(--color-border-subtle)] px-4 text-[13px] text-[var(--color-fg-1)] transition-colors hover:bg-[var(--color-bg-elev)]"
                  >
                    <ShieldCheck size={16} aria-hidden="true" />
                    Administración
                  </Link>
                )}
                <Link
                  href="/docs"
                  className="flex min-h-11 items-center gap-2 border-b border-[var(--color-border-subtle)] px-4 text-[13px] text-[var(--color-fg-1)] transition-colors hover:bg-[var(--color-bg-elev)]"
                >
                  <CircleHelp size={16} aria-hidden="true" />
                  Ayuda
                </Link>
                <button
                  onClick={logout}
                  className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-[13px] text-[var(--color-danger)] transition-colors hover:bg-[var(--color-bg-elev)]"
                >
                  <LogOut size={16} aria-hidden="true" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="md:hidden bg-[var(--color-bg-nav)] border-b border-[var(--color-accent)] px-4 py-3 flex items-center justify-between text-[14px] font-mono">
        <Link href="/app">
          <BrandMark size={24} />
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setDrawerOpen(true);
              if (user.role === "admin") router.prefetch("/admin");
            }}
            aria-label="Abrir menú"
            className="text-[var(--color-fg-1)] border border-[var(--color-border-strong)] px-3 py-1.5 rounded-[2px] text-[13px] font-bold"
          >
            MENU
          </button>
        </div>
      </div>

      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-[var(--color-bg-base)]">
          <div className="bg-[var(--color-bg-nav)] border-b border-[var(--color-accent)] px-4 py-3 flex items-center justify-between">
            <Link href="/app" onClick={() => setDrawerOpen(false)}>
              <BrandMark size={24} />
            </Link>
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Cerrar menú"
              className="inline-flex items-center justify-center p-2 text-[var(--color-fg-1)]"
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            <div className="px-4 pb-2 text-[11px] uppercase text-[var(--color-fg-4)] font-mono">
              Navegación
            </div>
            {tabs.map((t) => {
              const active = path?.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  onFocus={() => prefetchSection(t.href)}
                  onTouchStart={() => prefetchSection(t.href)}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    "block cursor-pointer px-4 py-4 text-[18px] font-mono border-l-4 transition-colors",
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

          <div className="border-t border-[var(--color-border-subtle)] px-4 py-4 font-mono">
            <div className="text-[11px] uppercase text-[var(--color-fg-4)] mb-2">
              Sesión iniciada
            </div>
            <div className="flex items-center gap-3 mb-1">
              <span className="w-7 h-7 inline-flex items-center justify-center bg-[var(--color-accent)] text-[var(--landing-accent-ink)] font-bold text-[14px] rounded-[2px]">
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
            <div className="mb-4 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-[var(--color-border-subtle)] py-2.5 text-[11px]">
              <span className="uppercase text-[var(--color-fg-4)]">
                Rol: <span className="font-medium text-[var(--color-fg-0)]">{user.role}</span>
              </span>
              <span className="h-3 border-l border-[var(--color-border)]" aria-hidden="true" />
              <ApiHealthIndicator health={apiHealth} />
            </div>
            <div className="mb-4 flex items-center justify-between gap-3 border-y border-[var(--color-border-subtle)] py-2.5">
              <span className="text-[11px] uppercase text-[var(--color-fg-4)]">Apariencia</span>
              <div className="flex overflow-hidden rounded-[2px] border border-[var(--color-border)]" role="group" aria-label="Cambiar apariencia">
                <button
                  type="button"
                  title="Vista clara"
                  aria-label="Vista clara"
                  aria-pressed={theme === "light"}
                  onClick={() => setTheme("light")}
                  className={`grid h-8 w-9 place-items-center transition-colors ${theme === "light" ? "bg-[var(--color-accent)] text-[var(--landing-accent-ink)]" : "text-[var(--color-fg-3)] hover:text-[var(--color-fg-0)]"}`}
                >
                  <Sun size={16} />
                </button>
                <button
                  type="button"
                  title="Vista oscura"
                  aria-label="Vista oscura"
                  aria-pressed={theme === "dark"}
                  onClick={() => setTheme("dark")}
                  className={`grid h-8 w-9 place-items-center border-l border-[var(--color-border)] transition-colors ${theme === "dark" ? "bg-[var(--color-accent)] text-[var(--landing-accent-ink)]" : "text-[var(--color-fg-3)] hover:text-[var(--color-fg-0)]"}`}
                >
                  <Moon size={16} />
                </button>
              </div>
            </div>
            <div className="border-t border-[var(--color-border-subtle)] pt-3">
              <Link
                href="/billing"
                onClick={() => setDrawerOpen(false)}
                className="mb-2 flex w-full items-center gap-2 border border-[var(--color-border-strong)] px-4 py-3 text-[14px] text-[var(--color-fg-1)]"
              >
                <CreditCard size={17} aria-hidden="true" />
                {activePlanLabel}
              </Link>
            </div>
            {user.role === "admin" && (
              <Link
                href="/admin"
                onTouchStart={() => router.prefetch("/admin")}
                onFocus={() => router.prefetch("/admin")}
                onClick={() => setDrawerOpen(false)}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-[2px] border border-[var(--color-accent)] px-4 py-3 text-[14px] text-[var(--color-accent)]"
              >
                <ShieldCheck size={17} aria-hidden="true" />
                Administración
              </Link>
            )}
            <Link
              href="/docs"
              onClick={() => setDrawerOpen(false)}
              className="mb-3 flex w-full items-center gap-2 border border-[var(--color-border-strong)] px-4 py-3 text-[14px] text-[var(--color-fg-1)]"
            >
              <CircleHelp size={17} aria-hidden="true" />
              Ayuda
            </Link>
            <button
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-[2px] border border-[var(--color-danger)] px-4 py-3 text-[14px] font-bold text-[var(--color-danger)]"
            >
              <LogOut size={17} aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </>
  );
}
