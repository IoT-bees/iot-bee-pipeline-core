"use client";

import { LoaderCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { shouldShowNavigationFeedback } from "@/lib/navigationFeedback";

const MAX_NAVIGATION_FEEDBACK_MS = 15_000;

export function NavigationProgress() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, setIsPending] = useState(false);

  function finishNavigation() {
    setIsPending(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function startNavigation() {
    setIsPending(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(finishNavigation, MAX_NAVIGATION_FEEDBACK_MS);
  }

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    finishNavigation();
  }, [pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (shouldShowNavigationFeedback(event, window.location.href)) {
        startNavigation();
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!isPending) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100]"
      role="status"
      aria-live="polite"
      aria-label="Cargando sección"
    >
      <div className="h-1 overflow-hidden bg-[var(--color-bg-elev)]">
        <div className="h-full w-2/3 animate-pulse bg-[var(--color-accent)]" />
      </div>
      <div className="mx-auto flex w-fit items-center gap-2 rounded-b-[3px] border-x border-b border-[var(--color-border-strong)] bg-[var(--color-bg-panel)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--color-fg-2)] shadow-sm">
        <LoaderCircle size={13} className="animate-spin text-[var(--color-accent)]" aria-hidden="true" />
        Cargando sección
      </div>
    </div>
  );
}
