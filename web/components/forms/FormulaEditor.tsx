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
    <div className="rounded-[2px] border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-4">
      <div className="mb-2 text-[13px] font-bold text-[var(--color-fg-1)]">{`Fórmula para ${fieldName || "este campo"}`}</div>
      <p className="max-w-[76ch] text-[14px] leading-6 text-[var(--color-fg-3)]">
        Se ejecuta cuando llega la telemetría y reemplaza el valor que se guarda para este campo.
        Déjala vacía para conservar el valor recibido.
      </p>
      <div className="mt-3 rounded-[2px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev)] px-3 py-2 text-[13px] font-mono leading-6 text-[var(--color-fg-3)]">
        <div><span className="font-bold text-[var(--color-fg-2)]">Llega:</span> {`{ "temperatura": 68 }`}</div>
        <div><span className="font-bold text-[var(--color-fg-2)]">Fórmula:</span> <code>(temperatura - 32) * 0.5</code></div>
        <div><span className="font-bold text-[var(--color-fg-2)]">Se guarda:</span> {`{ "temperatura": 18 }`}</div>
      </div>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ej. (temperatura - 32) * 0.5"
        autoComplete="off"
      />
      <div className="mt-2 text-[11px] font-mono">
        {parsed.ok ? (
          value.trim() === "" ? (
            <span className="text-[var(--color-fg-3)]">
              Sin transformación
            </span>
          ) : (
            <span className="text-[var(--color-accent)]">Fórmula válida</span>
          )
        ) : (
          <span className="text-[var(--color-danger)]">
            × Revisa la fórmula en la columna {parsed.error.pos + 1}.
          </span>
        )}
      </div>
      {availableVariables.length > 0 && (
        <div className="mt-2 text-[11px] text-[var(--color-fg-3)] font-mono">
          Nombres de campo sugeridos: {availableVariables.join(", ")}
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
