"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormulaEditor } from "./FormulaEditor";

export type FieldType = "float" | "int" | "bool" | "string";

export interface FieldRow {
  name: string;
  type: FieldType;
  required: boolean;
  defaultValue: string;
  min: string;
  max: string;
  formula: string;
}

interface Props {
  row: FieldRow;
  availableVariables: string[];
  canRemove?: boolean;
  onChange: (row: FieldRow) => void;
  onRemove: () => void;
}

function isNumeric(t: FieldType): boolean {
  return t === "float" || t === "int";
}

function acceptsBounds(t: FieldType): boolean {
  return t === "float" || t === "int" || t === "string";
}

function acceptNumericInput(value: string, allowDecimal: boolean): boolean {
  if (value === "" || value === "-") return true;
  return (allowDecimal ? /^-?\d*\.?\d*$/ : /^-?\d*$/).test(value);
}

function acceptNonNegativeInt(value: string): boolean {
  if (value === "") return true;
  return /^\d+$/.test(value);
}

const fieldTypeOptions: ReadonlyArray<{ value: FieldType; label: string }> = [
  { value: "float", label: "float" },
  { value: "int", label: "int" },
  { value: "bool", label: "bool" },
  { value: "string", label: "string" },
];

export function SchemaFieldRow({
  row,
  availableVariables,
  canRemove = true,
  onChange,
  onRemove,
}: Props) {
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const typePickerRef = useRef<HTMLDivElement>(null);
  const numeric = isNumeric(row.type);
  const allowDecimal = row.type === "float";

  useEffect(() => {
    if (!isTypeMenuOpen) return;

    function closeTypeMenu(event: MouseEvent) {
      if (!typePickerRef.current?.contains(event.target as Node)) {
        setIsTypeMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeTypeMenu);
    return () => document.removeEventListener("mousedown", closeTypeMenu);
  }, [isTypeMenuOpen]);

  function patch(p: Partial<FieldRow>) {
    onChange({ ...row, ...p });
  }

  function handleTypeChange(t: FieldType) {
    const next: FieldRow = { ...row, type: t };
    if (!acceptsBounds(t)) {
      next.min = "";
      next.max = "";
    }
    if (!isNumeric(t)) {
      next.formula = "";
    }
    const allowDecimalNext = t === "float";
    if (isNumeric(t)) {
      if (!acceptNumericInput(next.min, allowDecimalNext)) next.min = "";
      if (!acceptNumericInput(next.max, allowDecimalNext)) next.max = "";
    } else if (t === "string") {
      if (!acceptNonNegativeInt(next.min)) next.min = "";
      if (!acceptNonNegativeInt(next.max)) next.max = "";
    }
    if (next.defaultValue !== "") {
      if (isNumeric(t)) {
        if (!acceptNumericInput(next.defaultValue, allowDecimalNext)) {
          next.defaultValue = "";
        }
      } else if (t === "bool") {
        if (next.defaultValue !== "true" && next.defaultValue !== "false") {
          next.defaultValue = "";
        }
      }
    }
    onChange(next);
  }

  const CHECK_SVG =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%230A0A0A'%3E%3Cpath d='M6.4 11.6L3 8.2l1.4-1.4 2 2L11.6 3.6 13 5z'/%3E%3C/svg%3E\")";

  return (
    <div className="mb-2 rounded-[2px] border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-3">
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-6 lg:grid-cols-12">
        <label className="col-span-2 flex flex-col sm:col-span-2 lg:col-span-3">
          <span className="t-label font-bold">NOMBRE <span className="text-[var(--color-danger)]" aria-hidden="true">*</span></span>
          <Input
            aria-label="Nombre"
            value={row.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="nombre-del-campo"
            autoComplete="off"
          />
        </label>
        <div className="flex flex-col sm:col-span-2 lg:col-span-2">
          <span className="t-label font-bold">TIPO</span>
          <div ref={typePickerRef} className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isTypeMenuOpen}
              aria-label="Tipo"
              className="flex w-full items-center justify-between rounded-[2px] border border-[var(--color-border)] bg-[var(--color-bg-panel)] px-3 py-[10px] font-mono text-[14px] text-[var(--color-fg-1)] outline-none transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent)]"
              onClick={() => setIsTypeMenuOpen((open) => !open)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setIsTypeMenuOpen(true);
                }
                if (event.key === "Escape") setIsTypeMenuOpen(false);
              }}
            >
              <span>{row.type}</span>
              <ChevronDown
                size={18}
                aria-hidden="true"
                className={`shrink-0 text-[var(--color-fg-3)] transition-transform ${isTypeMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isTypeMenuOpen && (
              <div
                role="listbox"
                aria-label="Opciones de tipo"
                className="absolute left-0 right-0 top-full z-20 mt-2 border border-[var(--color-border-strong)] bg-[var(--color-bg-panel)] p-1 shadow-[0_12px_28px_rgb(0_0_0_/_0.18)]"
              >
                {fieldTypeOptions.map((option) => {
                  const isSelected = option.value === row.type;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className="flex min-h-10 w-full items-center justify-between px-3 text-left font-mono text-[14px] text-[var(--color-fg-1)] transition-colors hover:bg-[var(--color-bg-hover)] focus:bg-[var(--color-bg-hover)] focus:outline-none"
                      onClick={() => {
                        handleTypeChange(option.value);
                        setIsTypeMenuOpen(false);
                      }}
                    >
                      {option.label}
                      {isSelected && <Check size={16} aria-hidden="true" className="text-[var(--color-accent-strong)]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <label className="col-span-2 flex flex-col sm:col-span-2 lg:col-span-2">
          <span className="t-label font-bold">PREDETERMINADO</span>
          {row.type === "bool" ? (
            <Select
              aria-label="Valor predeterminado"
              value={row.defaultValue}
              onChange={(e) => patch({ defaultValue: e.target.value })}
            >
              <option value="">—</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </Select>
          ) : (
            <Input
              aria-label="Valor predeterminado"
              type="text"
              inputMode={numeric ? "decimal" : undefined}
              value={row.defaultValue}
              placeholder="Sin valor"
              onChange={(e) => {
                const v = e.target.value;
                if (!numeric || acceptNumericInput(v, allowDecimal)) {
                  patch({ defaultValue: v });
                }
              }}
              autoComplete="off"
            />
          )}
        </label>
        <label className="flex flex-col sm:col-span-2 lg:col-span-1">
          <span className="t-label font-bold">MÍN.</span>
          <Input
            aria-label="Mínimo"
            type="text"
            inputMode={row.type === "string" ? "numeric" : "decimal"}
            value={row.min}
            disabled={!acceptsBounds(row.type)}
            placeholder="—"
            onChange={(e) => {
              const v = e.target.value;
              if (numeric) {
                if (acceptNumericInput(v, allowDecimal)) patch({ min: v });
              } else if (row.type === "string") {
                if (acceptNonNegativeInt(v)) patch({ min: v });
              }
            }}
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col sm:col-span-2 lg:col-span-1">
          <span className="t-label font-bold">MÁX.</span>
          <Input
            aria-label="Máximo"
            type="text"
            inputMode={row.type === "string" ? "numeric" : "decimal"}
            value={row.max}
            disabled={!acceptsBounds(row.type)}
            placeholder="—"
            onChange={(e) => {
              const v = e.target.value;
              if (numeric) {
                if (acceptNumericInput(v, allowDecimal)) patch({ max: v });
              } else if (row.type === "string") {
                if (acceptNonNegativeInt(v)) patch({ max: v });
              }
            }}
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col items-center lg:col-span-1">
          <span className="t-label font-bold">OBLIG.</span>
          <span className="flex min-h-[42px] items-center">
            <input
              type="checkbox"
              aria-label="Obligatorio"
              checked={row.required}
              onChange={(e) => patch({ required: e.target.checked })}
              style={{ backgroundImage: row.required ? CHECK_SVG : undefined }}
              className="h-[18px] w-[18px] cursor-pointer appearance-none rounded-[2px] border border-[var(--color-border)] bg-[var(--color-bg-panel)] bg-center bg-no-repeat transition-colors checked:border-[var(--color-accent)] checked:bg-[var(--color-accent)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </span>
        </label>
        <div className="col-span-2 flex flex-col pt-[19px] sm:col-span-6 lg:col-span-2">
          <div className="flex min-h-[47px] items-stretch gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-[47px] flex-1 gap-1 whitespace-nowrap"
              aria-expanded={formulaOpen}
              onClick={() => setFormulaOpen((v) => !v)}
              disabled={!numeric}
            >
              {row.formula ? "Fórmula ✓" : "Fórmula"}
              <ChevronDown
                size={16}
                aria-hidden="true"
                className={formulaOpen ? "rotate-180 transition-transform" : "transition-transform"}
              />
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="min-h-[47px] w-11 shrink-0 px-0"
              onClick={onRemove}
              aria-label="Eliminar campo"
              disabled={!canRemove}
              title={canRemove ? "Eliminar campo" : "Una definición debe tener al menos un campo"}
            >
              <X size={14} strokeWidth={2.5} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
      {formulaOpen && numeric && (
        <div className="mt-3">
          <FormulaEditor
            fieldName={row.name || "(unnamed)"}
            availableVariables={availableVariables}
            value={row.formula}
            onChange={(text) => patch({ formula: text })}
          />
        </div>
      )}
    </div>
  );
}
