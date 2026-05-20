"use client";
import { Command } from "cmdk";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCommandBar } from "@/lib/store/useCommandBar";

export function CommandBar() {
  const { open, setOpen, toggle, query, setQuery } = useCommandBar();
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, setOpen]);

  if (!open) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="hidden sm:block w-full bg-[var(--color-bg-panel)] border-b border-[#1f1f1f] px-5 py-2.5 text-left text-[13px] font-mono text-[var(--color-fg-3)] hover:text-[var(--color-fg-1)]"
        >
          <span className="text-[var(--color-accent)] mr-2">$</span>
          run, navigate, search…
          <span className="float-right border border-[#333] px-2 text-[11px] py-[2px]">
            ⌘K
          </span>
        </button>
        <button
          onClick={() => setOpen(true)}
          className="sm:hidden fixed bottom-4 right-4 z-30 bg-[var(--color-accent)] text-[var(--color-bg-base)] w-12 h-12 rounded-full font-bold text-[20px]"
        >
          ⌘
        </button>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-start justify-center pt-24">
      <Command className="bg-[var(--color-bg-panel)] border border-[var(--color-accent)] w-[640px] max-w-[90vw] rounded-[3px] overflow-hidden">
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="type a command…"
          className="w-full bg-transparent text-[var(--color-fg-1)] px-5 py-4 text-[15px] font-mono outline-none"
        />
        <Command.List className="max-h-[360px] overflow-y-auto p-2">
          <Command.Empty className="p-3 text-[var(--color-fg-3)] text-[13px]">
            {"// "}no matches
          </Command.Empty>
          <Command.Group
            heading="navigate"
            className="text-[12px] text-[var(--color-fg-3)] tracking-[2px] px-2 py-1"
          >
            {[
              { label: "go overview", href: "/app" },
              { label: "go pipelines", href: "/pipelines" },
              { label: "go sources", href: "/sources" },
              { label: "go stores", href: "/stores" },
              { label: "go schemas", href: "/schemas" },
              { label: "go groups", href: "/groups" },
              { label: "go billing", href: "/billing" },
              { label: "new pipeline", href: "/pipelines/new" },
              { label: "new source", href: "/sources/new" },
              { label: "new store", href: "/stores/new" },
              { label: "new schema", href: "/schemas/new" },
            ].map((item) => (
              <Command.Item
                key={item.label}
                onSelect={() => {
                  setOpen(false);
                  router.push(item.href);
                }}
                className="px-3 py-2.5 text-[14px] font-mono cursor-pointer data-[selected=true]:bg-[var(--color-bg-elev)] rounded-[2px]"
              >
                {item.label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
