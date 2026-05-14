"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/app", label: "overview" },
  { href: "/pipelines", label: "pipelines" },
  { href: "/sources", label: "sources" },
  { href: "/stores", label: "stores" },
  { href: "/schemas", label: "schemas" },
  { href: "/groups", label: "groups" },
];

export function TopNav({ userName }: { userName?: string }) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="bg-[#050505] border-b border-[var(--color-accent)] px-4 py-2.5 flex items-center gap-5 text-[11px] font-mono">
      <Link
        href="/app"
        className="text-[var(--color-accent)] font-bold tracking-[2px] whitespace-nowrap"
      >
        iot-bee //
      </Link>
      <nav className="flex gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "text-[var(--color-fg-3)] hover:text-[var(--color-fg-1)] whitespace-nowrap",
              path?.startsWith(t.href) &&
                "text-[var(--color-fg-0)] border-b border-[var(--color-accent)] pb-[2px]",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3 text-[10px] text-[var(--color-fg-3)] whitespace-nowrap">
        <span className="text-[var(--color-accent)]">●</span>
        <span className="hidden sm:inline">api up</span>
        <span className="hidden sm:inline">{userName ?? "—"}</span>
        <button onClick={logout} className="hover:text-[var(--color-danger)]">
          logout
        </button>
      </div>
    </div>
  );
}
