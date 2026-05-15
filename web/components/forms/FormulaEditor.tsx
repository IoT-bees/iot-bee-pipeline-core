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
              // empty = no transformation
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
