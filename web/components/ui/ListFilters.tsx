"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Filtrar…" }: SearchInputProps) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase text-[var(--color-fg-4)]">Buscar</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-9 w-[220px] bg-[var(--color-bg-panel)] border border-[var(--color-border)] px-2 py-1.5 text-[13px] text-[var(--color-fg-2)] font-mono focus:outline-none focus:border-[var(--color-accent)]"
      />
    </label>
  );
}

type FilterOption<T extends string> = T | { value: T; label: string };

interface SelectFilterProps<T extends string> {
  label: string;
  value: T | "ALL";
  options: ReadonlyArray<FilterOption<T>>;
  onChange: (v: T | "ALL") => void;
}

export function SelectFilter<T extends string>({ label, value, options, onChange }: SelectFilterProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const selectedOption = [
    { value: "ALL" as const, label: "todos" },
    ...options.map((option) => ({
      value: typeof option === "string" ? option : option.value,
      label: typeof option === "string" ? option.toLowerCase() : option.label,
    })),
  ].find((option) => option.value === value);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <label className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase text-[var(--color-fg-4)]">{label}</span>
      <div ref={filterRef} className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={`Filtrar por ${label}`}
          className="flex min-h-9 items-center gap-2 border border-[var(--color-border)] bg-[var(--color-bg-panel)] px-2 py-1.5 font-mono text-[13px] text-[var(--color-fg-2)] outline-none focus:border-[var(--color-accent)]"
          onClick={() => setIsOpen((open) => !open)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsOpen(true);
            }
            if (event.key === "Escape") setIsOpen(false);
          }}
        >
          <span>{selectedOption?.label ?? "todos"}</span>
          <ChevronDown
            size={15}
            aria-hidden="true"
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        {isOpen && (
          <div
            role="listbox"
            aria-label={`Opciones de ${label}`}
            className="absolute left-0 top-full z-30 mt-2 min-w-full border border-[var(--color-border-strong)] bg-[var(--color-bg-panel)] p-1 shadow-[0_12px_28px_rgb(0_0_0_/_0.18)]"
          >
            {[{ value: "ALL" as const, label: "todos" }, ...options].map((option) => {
              const optionValue = typeof option === "string" ? option : option.value;
              const optionLabel = typeof option === "string" ? option.toLowerCase() : option.label;
              const isSelected = optionValue === value;

              return (
                <button
                  key={optionValue}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className="flex min-h-8 w-full items-center justify-between gap-3 px-2 text-left font-mono text-[13px] text-[var(--color-fg-2)] hover:bg-[var(--color-bg-hover)] focus:bg-[var(--color-bg-hover)] focus:outline-none"
                  onClick={() => {
                    onChange(optionValue as T | "ALL");
                    setIsOpen(false);
                  }}
                >
                  {optionLabel}
                  {isSelected && <Check size={14} aria-hidden="true" className="shrink-0 text-[var(--color-accent-strong)]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </label>
  );
}
