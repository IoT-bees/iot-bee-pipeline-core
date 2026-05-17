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

export function SchemaFieldRow({
  row,
  availableVariables,
  onChange,
  onRemove,
}: Props) {
  const [formulaOpen, setFormulaOpen] = useState(false);
  const numeric = isNumeric(row.type);

  function patch(p: Partial<FieldRow>) {
    onChange({ ...row, ...p });
  }

  function handleTypeChange(t: FieldType) {
    const next: FieldRow = { ...row, type: t };
    if (!isNumeric(t)) {
      next.min = "";
      next.max = "";
      next.formula = "";
    }
    onChange(next);
  }

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
            className="h-[18px] w-[18px]"
          />
        </label>
        <label className="flex flex-col">
          <span className="t-label">{"// "}DEFAULT</span>
          <Input
            aria-label="default"
            value={row.defaultValue}
            onChange={(e) => patch({ defaultValue: e.target.value })}
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col">
          <span className="t-label">{"// "}MIN</span>
          <Input
            aria-label="min"
            value={row.min}
            disabled={!numeric}
            onChange={(e) => patch({ min: e.target.value })}
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col">
          <span className="t-label">{"// "}MAX</span>
          <Input
            aria-label="max"
            value={row.max}
            disabled={!numeric}
            onChange={(e) => patch({ max: e.target.value })}
            autoComplete="off"
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setFormulaOpen((v) => !v)}
          disabled={!numeric}
        >
          {row.formula ? "formula ✓" : "formula"}
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
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
