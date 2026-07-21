"use client";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ChevronDown, CircleHelp, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
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
  submitLabel: ReactNode;
  submitting?: boolean;
  onSubmit: (payload: SubmitPayload) => Promise<void> | void;
  disabled?: boolean;
  nameReadOnly?: boolean;
  onCancel?: () => void;
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
        `"${r.name || "(sin nombre)"}": ${nameCheck.error.issues[0].message}`,
      );
      continue;
    }
    if (seen.has(r.name)) {
      errors.push(`El campo "${r.name}" está repetido.`);
      continue;
    }
    seen.add(r.name);

    let operation: Record<string, unknown> | null = null;
    if (r.formula.trim() !== "") {
      const p = parseFormula(r.formula);
      if (!p.ok) {
        errors.push(
          `"${r.name}": error de fórmula en la columna ${p.error.pos + 1}. Revisa la expresión.`,
        );
        continue;
      }
      operation = toBackend(p.expr) as Record<string, unknown>;
    }

    const min = parseNumOrUndef(r.min);
    const max = parseNumOrUndef(r.max);
    if (min !== undefined && max !== undefined && min > max) {
      errors.push(`"${r.name}": el mínimo no puede ser mayor que el máximo.`);
      continue;
    }
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
  nameReadOnly,
  onCancel,
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [isJsonOpen, setIsJsonOpen] = useState(false);
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

  function requestExampleFromHelp(): void {
    setHelpOpen(false);
    requestLoadExample();
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
      <FormField
        label={<><span className="font-bold">NOMBRE DE LA DEFINICIÓN</span> <span className="text-[var(--color-danger)]" aria-hidden="true">*</span></>}
        hint={nameReadOnly ? "El nombre no se puede modificar después de crear la definición." : undefined}
        error={nameError ?? undefined}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="telemetría-clima"
          autoComplete="off"
          disabled={nameReadOnly}
        />
      </FormField>

      <section className="mt-7 flex items-center justify-between rounded-[3px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev)] px-3 py-2" aria-labelledby="schema-fields-heading">
        <div>
          <h2 id="schema-fields-heading" className="t-section font-bold">Campos y reglas</h2>
        </div>
        <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => setHelpOpen(true)}>
          <CircleHelp size={16} aria-hidden="true" />
          Ayuda
        </Button>
      </section>
      <div className="mt-3">
        {rows.map((row, idx) => (
          <SchemaFieldRow
            key={row._rid}
            row={row}
            availableVariables={availableVariables}
            canRemove={rows.length > 1}
            onChange={(updated) =>
              setRows((rs) =>
                rs.map((r, i) =>
                  i === idx ? { ...updated, _rid: r._rid } : r,
                ),
              )
            }
            onRemove={() => setRows((rs) => rs.filter((_, i) => i !== idx))}
          />
        ))}
      </div>
      </fieldset>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-[39px] w-[175px] gap-2"
          onClick={() => setRows((rs) => [...rs, emptyRow()])}
          disabled={disabled}
        >
          <Plus size={16} aria-hidden="true" />
          Agregar campo
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-[39px] w-[175px] gap-2"
          aria-expanded={isJsonOpen}
          aria-controls="schema-json-preview"
          onClick={() => setIsJsonOpen((open) => !open)}
        >
          {isJsonOpen ? "Ocultar JSON" : "Ver JSON"}
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={isJsonOpen ? "rotate-180 transition-transform" : "transition-transform"}
          />
        </Button>
      </div>
      {isJsonOpen && (
        <pre id="schema-json-preview" className="mt-3 w-full overflow-x-auto rounded-[2px] border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-4 text-[14px] leading-6 text-[var(--color-fg-2)] whitespace-pre">
{currentSerialized.ok
  ? JSON.stringify(currentSerialized.schema, null, 2)
  : "La definición de datos tiene errores. Corrígelos arriba."}
        </pre>
      )}

      {serializeErrors.length > 0 && (
        <div role="alert" className="mt-4 border border-[var(--color-danger)] p-3 rounded-[2px] text-[12px] font-mono text-[var(--color-danger)]">
          {serializeErrors.map((e, i) => (
            <div key={i}>× {e}</div>
          ))}
        </div>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-[var(--color-border-subtle)] pt-5">
        {!disabled && (
          <Button
            type="button"
            variant="primary"
            className="min-h-11 gap-2"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitLabel}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={onCancel ?? (() => router.push("/schemas"))}
        >
          Cancelar
        </Button>
      </div>

      <ConfirmDialog
        open={confirmExample}
        title="¿Reemplazar los campos actuales?"
        message="Al cargar el ejemplo se reemplazarán los campos que ya ingresaste."
        confirmLabel="Cargar ejemplo"
        cancelLabel="Conservar mis campos"
        onConfirm={() => {
          setConfirmExample(false);
          loadExample();
        }}
        onClose={() => setConfirmExample(false)}
      />

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)}>
        <div className="p-5 text-left sm:p-6">
          <div className="mb-5">
            <div className="t-label mb-1.5 font-bold">Guía</div>
            <h3 className="text-[22px] font-semibold leading-tight text-[var(--color-fg-0)]">Campos y reglas</h3>
          </div>
          <p className="text-[15px] leading-6 text-[var(--color-fg-2)]">
            Configura el tipo, obligatoriedad y los límites válidos para cada campo.
          </p>
          <div className="mt-5 rounded-[2px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev)] p-3">
            <div className="text-[13px] font-bold text-[var(--color-fg-1)]">¿Necesitas una guía?</div>
            <p className="mt-1 text-[14px] leading-6 text-[var(--color-fg-3)]">Carga tres campos de ejemplo y adáptalos a la telemetría de tu proyecto.</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3 gap-2"
              onClick={requestExampleFromHelp}
              title="Reemplaza los campos actuales con un ejemplo de tres campos"
            >
              <ArrowDown size={14} aria-hidden="true" />
              Cargar ejemplo
            </Button>
          </div>
          <div className="mt-5 flex justify-end border-t border-[var(--color-border-subtle)] pt-4">
            <Button type="button" variant="ghost" size="sm" onClick={() => setHelpOpen(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
