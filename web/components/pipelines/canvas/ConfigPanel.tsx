"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { defaultTab, type TabKey } from "./defaultTab";
import type { SlotKind, SlotState } from "./types";

interface Props {
  slotKind: SlotKind;
  slotState: SlotState;
  existingCount: number;
  onClose: () => void;
  renderExistingTab: () => React.ReactNode;
  renderNewTab?: () => React.ReactNode;
}

const TITLE: Record<SlotKind, string> = {
  source: "Configurar conexión",
  schema: "Configurar esquema",
  store: "Configurar destino",
};

const HELP: Record<SlotKind, string> = {
  source: "Primero revisa tus conexiones existentes y selecciona una para conectarla al flujo. Crea una nueva solo si todavía no configuraste el broker.",
  schema: "El esquema revisa cada mensaje antes de enviarlo al destino. Selecciona uno existente o carga un ejemplo para ajustarlo.",
  store: "El destino recibe únicamente los datos que pasen la revisión del esquema. Selecciona uno existente o crea uno nuevo.",
};

export function ConfigPanel({ slotKind, existingCount, onClose, renderExistingTab, renderNewTab }: Props) {
  const [tab, setTab] = useState<TabKey>(renderNewTab ? defaultTab(existingCount) : "existing");
  const panelId = `pipeline-${slotKind}-panel`;
  const titleId = `pipeline-${slotKind}-title`;
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(12,18,24,0.68)] p-3 sm:p-6">
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[min(760px,calc(100vh-24px))] w-full flex-col overflow-hidden rounded-[8px] border border-[var(--color-border-strong)] bg-[var(--color-bg-panel)] shadow-2xl sm:max-h-[calc(100vh-48px)] ${
          slotKind === "schema" ? "max-w-[1040px]" : "max-w-[680px]"
        }`}
      >
        <header className="flex items-start justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-5 py-4 sm:px-6">
          <div>
            <h3 id={titleId} className="text-[15px] font-semibold text-[var(--color-fg-1)]">{TITLE[slotKind]}</h3>
            <p className="mt-1 pr-3 text-[11px] leading-4 text-[var(--color-fg-4)]">{HELP[slotKind]}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar configuración"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[3px] text-[var(--color-fg-3)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-accent-strong)]"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </header>
        <nav className={`grid ${renderNewTab ? "grid-cols-2" : "grid-cols-1"}`} role="tablist">
          <button
            type="button"
            role="tab"
            aria-controls={panelId}
            aria-selected={tab === "existing"}
            onClick={() => setTab("existing")}
            className={`border-b py-3 text-[11px] font-semibold ${
              tab === "existing"
                ? "border-[var(--color-accent)] bg-[var(--color-bg-base)] text-[var(--color-accent)]"
                : "border-[var(--color-border)] bg-[var(--color-bg-elev)] text-[var(--color-fg-3)] hover:text-[var(--color-fg-1)]"
            }`}
          >
            Elegir existente ({existingCount})
          </button>
          {renderNewTab && (
            <button
              type="button"
              role="tab"
              aria-controls={panelId}
              aria-selected={tab === "new"}
              onClick={() => setTab("new")}
              className={`border-b py-3 text-[11px] font-semibold ${
                tab === "new"
                  ? "border-[var(--color-accent)] bg-[var(--color-bg-base)] text-[var(--color-accent)]"
                  : "border-[var(--color-border)] bg-[var(--color-bg-elev)] text-[var(--color-fg-3)] hover:text-[var(--color-fg-1)]"
              }`}
            >
              + Crear nuevo
            </button>
          )}
        </nav>
        <div id={panelId} className="flex-1 overflow-y-auto p-5 sm:p-6" role="tabpanel">
          {tab === "existing" || !renderNewTab ? renderExistingTab() : renderNewTab()}
        </div>
      </aside>
    </div>
  );
}
