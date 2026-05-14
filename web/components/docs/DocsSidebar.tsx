"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Select } from "@/components/ui/Select";

export interface DocsSection {
  id: string;
  number: string;
  title: string;
}

export function DocsSidebar({ sections }: { sections: DocsSection[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0.1 },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <aside className="hidden lg:block w-[260px] shrink-0">
      <div className="sticky top-6">
        <div className="text-[11px] tracking-[2px] uppercase text-[var(--color-fg-4)] mb-3 font-mono">
          {"// "}contents
        </div>
        <nav className="flex flex-col gap-1 font-mono text-[14px]">
          {sections.map((s) => {
            const isActive = active === s.id;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={cn(
                  "px-3 py-2 rounded-[2px] border-l-2 transition-colors",
                  isActive
                    ? "border-l-[var(--color-accent)] text-[var(--color-fg-0)] bg-[var(--color-bg-elev)]"
                    : "border-l-transparent text-[var(--color-fg-3)] hover:text-[var(--color-fg-1)] hover:bg-[#0d0d0d]",
                )}
              >
                <span className="text-[var(--color-fg-4)] mr-2">{s.number}</span>
                {s.title}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export function DocsMobileNav({ sections }: { sections: DocsSection[] }) {
  return (
    <div className="lg:hidden mb-8 border border-[#1f1f1f] rounded-[3px] bg-[var(--color-bg-panel)] p-4">
      <div className="text-[11px] tracking-[2px] uppercase text-[var(--color-fg-4)] mb-2 font-mono">
        {"// "}jump to
      </div>
      <Select
        onChange={(e) => {
          const target = document.getElementById(e.target.value);
          if (target) target.scrollIntoView({ behavior: "smooth" });
        }}
      >
        {sections.map((s) => (
          <option key={s.id} value={s.id}>
            {s.number} · {s.title}
          </option>
        ))}
      </Select>
    </div>
  );
}
