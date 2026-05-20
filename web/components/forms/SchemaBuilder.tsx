"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import {
  SchemaFieldRow,
  type FieldRow,
  type FieldType,
} from "./SchemaFieldRow";
import type { FieldSchema, SchemaMap } from "@/lib/api/types";
import { parseFormula } from "@/lib/ast/parseFormula";
import { printFormula } from "@/lib/ast/printFormula";
import { fromBackend, toBackend } from "@/lib/ast/serialize";
import {
  fieldNameSchema,
  schemaNameSchema,
} from "@/lib/schemas/validationSchema";

interface SubmitPayload {
  name: string;
  schema: SchemaMap;
}

interface Props {
  defaultName?: string;
  defaultSchema?: SchemaMap;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (payload: SubmitPayload) => Promise<void> | void;
  disabled?: boolean;
}

let nextRowId = 1;
function makeRowId() {
  return nextRowId++;
}

interface RowWithId extends FieldRow {
  _rid: number;
}

function rowFromField(name: string, f: FieldSchema): RowWithId {
  const opExpr = f.operation ? fromBackend(f.operation) : null;
  return {
    _rid: makeRowId(),
    name,
    type: f.type,
    required: f.required ?? false,
    defaultValue:
      f.default === null || f.default === undefined ? "" : String(f.default),
    min:
      f.validation?.min === null || f.validation?.min === undefined
        ? ""
        : String(f.validation.min),
    max:
      f.validation?.max === null || f.validation?.max === undefined
        ? ""
        : String(f.validation.max),
    formula: opExpr ? printFormula(opExpr) : "",
  };
}

function emptyRow(type: FieldType = "float"): RowWithId {
  return {
    _rid: makeRowId(),
    name: "",
    type,
    required: true,
    defaultValue: "",
    min: "",
    max: "",
    formula: "",
  };
}

function exampleRows(): RowWithId[] {
  return [
    {
      _rid: makeRowId(),
      name: "temperature",
      type: "float",
      required: true,
      defaultValue: "",
      min: "-40",
      max: "85",
      formula: "",
    },
    {
      _rid: makeRowId(),
      name: "humidity",
      type: "float",
      required: false,
      defaultValue: "",
      min: "0",
      max: "100",
      formula: "",
    },
    {
      _rid: makeRowId(),
      name: "device_id",
      type: "string",
      required: true,
      defaultValue: "",
      min: "",
      max: "",
      formula: "",
    },
  ];
}

function rowsAreDirty(rows: RowWithId[]): boolean {
  return rows.some(
    (r) =>
      r.name !== "" ||
      r.defaultValue !== "" ||
      r.min !== "" ||
      r.max !== "" ||
      r.formula !== "",
  );
}

function parseDefault(
  type: FieldType,
  raw: string,
): number | boolean | string | null {
  if (raw === "") return null;
  if (type === "bool") return raw === "true";
  if (type === "string") return raw;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  return n;
}

function parseNumOrUndef(raw: string): number | undefined {
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

type SerializeResult =
  | { ok: true; schema: SchemaMap }
  | { ok: false; errors: string[] };

function serializeRows(rows: RowWithId[]): SerializeResult {
  const errors: string[] = [];
  const out: SchemaMap = {};
  const seen = new Set<string>();
  for (const r of rows) {
    const nameCheck = fieldNameSchema.safeParse(r.name);
    if (!nameCheck.success) {
      errors.push(
        `"${r.name || "(unnamed)"}": ${nameCheck.error.issues[0].message}`,
      );
      continue;
    }
    if (seen.has(r.name)) {
      errors.push(`duplicate field name "${r.name}"`);
      continue;
    }
    seen.add(r.name);

    let operation: Record<string, unknown> | null = null;
    if (r.formula.trim() !== "") {
      const p = parseFormula(r.formula);
      if (!p.ok) {
        errors.push(
          `"${r.name}": formula error at col ${p.error.pos + 1}: ${p.error.message}`,
        );
        continue;
      }
      operation = toBackend(p.expr) as Record<string, unknown>;
    }

    const min = parseNumOrUndef(r.min);
    const max = parseNumOrUndef(r.max);
    const validation =
      min !== undefined || max !== undefined ? { min, max } : null;

    const field: FieldSchema = {
      type: r.type,
      required: r.required,
      default: parseDefault(r.type, r.defaultValue),
      validation,
      operation,
    };
    out[r.name] = field;
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, schema: out };
}

export function SchemaBuilder({
  defaultName,
  defaultSchema,
  submitLabel,
  submitting,
  onSubmit,
  disabled,
}: Props) {
  const [name, setName] = useState(defaultName ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [rows, setRows] = useState<RowWithId[]>(() => {
    if (defaultSchema && Object.keys(defaultSchema).length > 0) {
      return Object.entries(defaultSchema).map(([n, f]) => rowFromField(n, f));
    }
    return [emptyRow()];
  });
  const [serializeErrors, setSerializeErrors] = useState<string[]>([]);
  const [confirmExample, setConfirmExample] = useState(false);
  const router = useRouter();

  function loadExample(): void {
    setRows(exampleRows());
    setSerializeErrors([]);
  }

  function requestLoadExample(): void {
    if (rowsAreDirty(rows)) {
      setConfirmExample(true);
    } else {
      loadExample();
    }
  }

  const availableVariables = useMemo(
    () => rows.map((r) => r.name).filter((n) => n.length > 0),
    [rows],
  );

  const currentSerialized = useMemo(() => serializeRows(rows), [rows]);

  async function handleSubmit() {
    const nameCheck = schemaNameSchema.safeParse(name);
    if (!nameCheck.success) {
      setNameError(nameCheck.error.issues[0].message);
      return;
    }
    setNameError(null);

    if (!currentSerialized.ok) {
      setSerializeErrors(currentSerialized.errors);
      return;
    }
    setSerializeErrors([]);
    await onSubmit({ name, schema: currentSerialized.schema });
  }

  return (
    <div className="max-w-[1100px]">
      <fieldset disabled={disabled} className="border-0 p-0 m-0 min-w-0 disabled:opacity-60">
      <FormField label="SCHEMA NAME" error={nameError ?? undefined}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. weather"
          autoComplete="off"
        />
      </FormField>

      <div className="flex items-center justify-between mt-6 mb-3 gap-3 flex-wrap">
        <h2 className="t-section">{"// "}fields</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={requestLoadExample}
          title="replace current fields with a 3-field example"
        >
          ↓ LOAD EXAMPLE
        </Button>
      </div>
      {rows.map((row, idx) => (
        <SchemaFieldRow
          key={row._rid}
          row={row}
          availableVariables={availableVariables.filter(
            (n) => n !== row.name,
          )}
          onChange={(updated) =>
            setRows((rs) =>
              rs.map((r, i) =>
                i === idx ? { ...updated, _rid: r._rid } : r,
              ),
            )
          }
          onRemove={() =>
            setRows((rs) =>
              rs.length > 1 ? rs.filter((_, i) => i !== idx) : rs,
            )
          }
        />
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setRows((rs) => [...rs, emptyRow()])}
      >
        + add field
      </Button>

      {serializeErrors.length > 0 && (
        <div className="mt-4 border border-[var(--color-danger)] p-3 rounded-[2px] text-[12px] font-mono text-[var(--color-danger)]">
          {serializeErrors.map((e, i) => (
            <div key={i}>× {e}</div>
          ))}
        </div>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-[12px] font-mono text-[var(--color-fg-3)]">
          ▸ show raw JSON
        </summary>
        <pre className="mt-2 text-[11px] font-mono text-[var(--color-fg-2)] whitespace-pre overflow-x-auto p-3 border border-[#2a2a2a] rounded-[2px] bg-[var(--color-bg-panel)]">
{currentSerialized.ok
  ? JSON.stringify(currentSerialized.schema, null, 2)
  : "// schema currently has errors — fix them above"}
        </pre>
      </details>

      </fieldset>
      <div className="flex gap-3 items-center mt-6">
        {!disabled && (
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || !currentSerialized.ok}
          >
            {submitLabel}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/schemas")}
        >
          cancel
        </Button>
      </div>

      <ConfirmDialog
        open={confirmExample}
        title="replace current fields?"
        message="loading the example will overwrite the fields you have entered."
        confirmLabel="load example"
        cancelLabel="keep my fields"
        onConfirm={() => {
          setConfirmExample(false);
          loadExample();
        }}
        onClose={() => setConfirmExample(false)}
      />
    </div>
  );
}
