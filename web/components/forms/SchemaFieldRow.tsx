"use client";
import { useState } from "react";
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

function placeholderFor(field: "default" | "min" | "max", type: FieldType): string {
  if (field === "default") {
    if (type === "float") return "e.g. 23.5";
    if (type === "int") return "e.g. 100";
    if (type === "string") return "e.g. sensor-a";
    return "";
  }
  if (field === "min") {
    if (type === "float") return "e.g. -50.0";
    if (type === "int") return "e.g. 0";
    if (type === "string") return "min length (e.g. 3)";
    return "n/a";
  }
  if (type === "float") return "e.g. 150.0";
  if (type === "int") return "e.g. 1000";
  if (type === "string") return "max length (e.g. 64)";
  return "n/a";
}

export function SchemaFieldRow({
  row,
  availableVariables,
  onChange,
  onRemove,
}: Props) {
  const [formulaOpen, setFormulaOpen] = useState(false);
  const numeric = isNumeric(row.type);
  const allowDecimal = row.type === "float";

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
    <div className="border border-[#2a2a2a] rounded-[2px] p-3 bg-[var(--color-bg-panel)] mb-2">
      <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_auto_1fr_1fr_1fr_auto_auto] gap-2 items-end">
        <label className="flex flex-col">
          <span className="t-label">{"// "}NAME</span>
          <Input
            aria-label="name"
            value={row.name}
            onChange={(e) => patch({ name: e.target.value })}
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col">
          <span className="t-label">{"// "}TYPE</span>
          <Select
            aria-label="type"
            value={row.type}
            onChange={(e) => handleTypeChange(e.target.value as FieldType)}
          >
            <option value="float">float</option>
            <option value="int">int</option>
            <option value="bool">bool</option>
            <option value="string">string</option>
          </Select>
        </label>
        <label className="flex flex-col items-center">
          <span className="t-label">{"// "}REQ</span>
          <input
            type="checkbox"
            aria-label="required"
            checked={row.required}
            onChange={(e) => patch({ required: e.target.checked })}
            style={{ backgroundImage: row.required ? CHECK_SVG : undefined }}
            className="h-[18px] w-[18px] cursor-pointer appearance-none border border-[#2a2a2a] bg-[var(--color-bg-panel)] rounded-[2px] bg-no-repeat bg-center transition-colors checked:bg-[var(--color-accent)] checked:border-[var(--color-accent)] focus:outline-none focus:border-[var(--color-accent)] mt-[6px]"
          />
        </label>
        <label className="flex flex-col">
          <span className="t-label">{"// "}DEFAULT</span>
          {row.type === "bool" ? (
            <Select
              aria-label="default"
              value={row.defaultValue}
              onChange={(e) => patch({ defaultValue: e.target.value })}
            >
              <option value="">—</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </Select>
          ) : (
            <Input
              aria-label="default"
              type="text"
              inputMode={numeric ? "decimal" : undefined}
              value={row.defaultValue}
              placeholder={placeholderFor("default", row.type)}
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
        <label className="flex flex-col">
          <span className="t-label">{"// "}MIN</span>
          <Input
            aria-label="min"
            type="text"
            inputMode={row.type === "string" ? "numeric" : "decimal"}
            value={row.min}
            disabled={!acceptsBounds(row.type)}
            placeholder={placeholderFor("min", row.type)}
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
        <label className="flex flex-col">
          <span className="t-label">{"// "}MAX</span>
          <Input
            aria-label="max"
            type="text"
            inputMode={row.type === "string" ? "numeric" : "decimal"}
            value={row.max}
            disabled={!acceptsBounds(row.type)}
            placeholder={placeholderFor("max", row.type)}
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
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => setFormulaOpen((v) => !v)}
          disabled={!numeric}
        >
          {row.formula ? "formula ✓" : "formula"}
        </Button>
        <Button
          type="button"
          variant="danger"
          size="md"
          onClick={onRemove}
          aria-label="remove field"
        >
          ×
        </Button>
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
