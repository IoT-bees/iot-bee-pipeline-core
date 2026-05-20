"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/Logo";

const links = [
  { href: "#how", label: "how it works" },
  { href: "#use-cases", label: "use cases" },
  { href: "#arch", label: "architecture" },
  { href: "/docs", label: "docs", internal: true },
  {
    href: "https://github.com/manuelmj/iot-bee",
    label: "GitHub ↗",
    external: true,
  },
];

export function MarketingNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHash = () => setDrawerOpen(false);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  return (
    <>
      <nav className="hidden md:flex px-4 sm:px-6 py-4 gap-x-4 justify-between items-center text-[14px] font-mono border-b border-[var(--color-accent)]">
        <Link href="/">
          <BrandMark size={28} />
        </Link>
        <div className="flex gap-5 text-[var(--color-fg-3)] items-center">
          {links.map((l) =>
            l.internal ? (
              <Link
                key={l.label}
                href={l.href}
                className="hover:text-[var(--color-fg-1)] transition-colors"
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.label}
                href={l.href}
                target={l.external ? "_blank" : undefined}
                rel={l.external ? "noreferrer" : undefined}
                className="hover:text-[var(--color-fg-1)] transition-colors"
              >
                {l.label}
              </a>
            ),
          )}
          <Link
            href="/login"
            className="bg-[var(--color-accent)] text-[var(--color-bg-base)] font-bold px-4 py-2 rounded-[2px] hover:bg-[var(--color-accent-dim)] transition-colors"
          >
            Launch app →
          </Link>
        </div>
      </nav>

      <nav className="md:hidden sticky top-0 z-40 bg-[var(--color-bg-base)] px-4 py-4 flex justify-between items-center text-[14px] font-mono border-b border-[var(--color-accent)]">
        <Link href="/">
          <BrandMark size={26} />
        </Link>
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="open menu"
          className="text-[var(--color-fg-1)] border border-[#333] px-3 py-1.5 rounded-[2px] text-[13px] font-bold tracking-[1px]"
        >
          MENU
        </button>
      </nav>

      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-[var(--color-bg-base)]">
          <div className="px-4 py-4 flex items-center justify-between border-b border-[var(--color-accent)]">
            <Link href="/" onClick={() => setDrawerOpen(false)}>
              <BrandMark size={26} />
            </Link>
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="close menu"
              className="text-[var(--color-fg-1)] text-[24px] leading-none px-3 py-1"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 font-mono">
            <div className="px-4 pb-2 text-[11px] tracking-[2px] uppercase text-[var(--color-fg-4)]">
              {"// "}navigate
            </div>
            {links.map((l) =>
              l.internal ? (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={() => setDrawerOpen(false)}
                  className="block px-4 py-4 text-[18px] text-[var(--color-fg-2)] border-l-4 border-l-transparent hover:bg-[var(--color-bg-elev)] transition-colors"
                >
                  {l.label}
                </Link>
              ) : (
                <a
                  key={l.label}
                  href={l.href}
                  target={l.external ? "_blank" : undefined}
                  rel={l.external ? "noreferrer" : undefined}
                  onClick={() => setDrawerOpen(false)}
                  className="block px-4 py-4 text-[18px] text-[var(--color-fg-2)] border-l-4 border-l-transparent hover:bg-[var(--color-bg-elev)] transition-colors"
                >
                  {l.label}
                </a>
              ),
            )}
          </div>

          <div className="border-t border-[#1f1f1f] px-4 py-4">
            <Link
              href="/login"
              onClick={() => setDrawerOpen(false)}
              className="block w-full text-center bg-[var(--color-accent)] text-[var(--color-bg-base)] font-bold py-3 text-[15px] rounded-[2px]"
            >
              Launch app →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
