"use client";
import { useMemo } from "react";
import { Input } from "@/components/ui/Input";
import { parseFormula } from "@/lib/ast/parseFormula";
import { treePreview } from "@/lib/ast/treePreview";

interface Props {
  fieldName: string;
  availableVariables: string[];
  value: string;
  onChange: (text: string) => void;
}

export function FormulaEditor({
  fieldName,
  availableVariables,
  value,
  onChange,
}: Props) {
  const parsed = useMemo(() => {
    if (value.trim() === "") return { ok: true as const, expr: null };
    return parseFormula(value);
  }, [value]);

  const tree = useMemo(() => {
    if (parsed.ok && parsed.expr) return treePreview(parsed.expr);
    return null;
  }, [parsed]);

  return (
    <div className="border border-[#2a2a2a] rounded-[2px] p-3 bg-[var(--color-bg-panel)]">
      <div className="t-label mb-1">{`// formula for ${fieldName}`}</div>
      <p className="text-[11px] text-[var(--color-fg-3)] leading-[1.6] mb-2">
        Optional arithmetic expression applied to each incoming value before
        it is persisted. Use it to convert units, derive a value from other
        fields, or apply a calibration offset. Leave empty to store the raw
        value as-is.
      </p>
      <div className="text-[11px] font-mono text-[var(--color-fg-3)] mb-2 leading-[1.7]">
        <div>{"// "}supported: + − × ÷ and parentheses</div>
        <div>{"// "}reference another field by its name (e.g. voltage * current)</div>
        <div>{"// "}use the field&apos;s own value via its name (e.g. temperature * 1.8 + 32)</div>
      </div>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. (temperature - 32) * 0.5"
        autoComplete="off"
      />
      <div className="mt-2 text-[11px] font-mono">
        {parsed.ok ? (
          value.trim() === "" ? (
            <span className="text-[var(--color-fg-3)]">
              {"// "}empty = no transformation
            </span>
          ) : (
            <span className="text-[var(--color-accent)]">[✓ valid]</span>
          )
        ) : (
          <span className="text-[var(--color-danger)]">
            × col {parsed.error.pos + 1}: {parsed.error.message}
          </span>
        )}
      </div>
      {availableVariables.length > 0 && (
        <div className="mt-2 text-[11px] text-[var(--color-fg-3)] font-mono">
          available: {availableVariables.join(", ")}
        </div>
      )}
      {tree && (
        <pre className="mt-3 text-[11px] text-[var(--color-fg-2)] font-mono whitespace-pre">
{tree}
        </pre>
      )}
    </div>
  );
}
