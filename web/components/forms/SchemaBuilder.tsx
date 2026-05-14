"use client";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { builderSchema, type BuilderInput } from "@/lib/schemas/validationSchema";
import type { SchemaMap } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Panel } from "@/components/ui/Panel";

const PLACEHOLDER = `{
  "temperature": {
    "type": "float",
    "required": true,
    "default": null,
    "validation": { "min": -40, "max": 85 },
    "operation": null
  },
  "humidity": {
    "type": "float",
    "required": true,
    "default": null,
    "validation": { "min": 0, "max": 100 },
    "operation": null
  },
  "active": {
    "type": "bool",
    "required": false,
    "default": true,
    "validation": null,
    "operation": null
  }
}`;

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
}

type ParseResult =
  | { ok: true; value: SchemaMap }
  | { ok: false; error: string };

function tryParse(text: string): ParseResult {
  try {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        error: "schema must be a JSON object whose keys are field names",
      };
    }
    return { ok: true, value: parsed as SchemaMap };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "invalid JSON" };
  }
}

export function SchemaBuilder({
  defaultName,
  defaultSchema,
  submitLabel,
  submitting,
  onSubmit,
}: Props) {
  const [parseError, setParseError] = useState<string | null>(null);

  const initialJson =
    defaultSchema && Object.keys(defaultSchema).length > 0
      ? JSON.stringify(defaultSchema, null, 2)
      : PLACEHOLDER;

  const form = useForm<BuilderInput>({
    resolver: zodResolver(builderSchema),
    defaultValues: { name: defaultName ?? "", schemaJson: initialJson },
  });

  const liveJson = form.watch("schemaJson");
  const livePreview = useMemo(() => {
    const r = tryParse(liveJson ?? "");
    return r.ok ? r.value : null;
  }, [liveJson]);

  async function handleSubmit(values: BuilderInput) {
    const r = tryParse(values.schemaJson);
    if (!r.ok) {
      setParseError(r.error);
      return;
    }
    setParseError(null);
    await onSubmit({ name: values.name, schema: r.value });
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="grid lg:grid-cols-[1fr_360px] gap-6"
    >
      <div>
        <FormField label="SCHEMA NAME" error={form.formState.errors.name?.message}>
          <Input {...form.register("name")} />
        </FormField>

        <FormField
          label="SCHEMA JSON (map of field-name → rule)"
          hint="each key is a field; supports type, required, default, validation:{min,max}, operation (AST or null)."
          error={form.formState.errors.schemaJson?.message ?? parseError ?? undefined}
        >
          <textarea
            {...form.register("schemaJson")}
            spellCheck={false}
            rows={22}
            className="block w-full bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-3 py-3 text-[13px] font-mono rounded-[2px] outline-none focus:border-[var(--color-accent)] leading-snug whitespace-pre"
          />
        </FormField>

        <div className="flex gap-3 items-center mt-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => form.setValue("schemaJson", PLACEHOLDER)}
          >
            load example
          </Button>
        </div>
      </div>

      <aside>
        <h2 className="t-section mb-3">{"// "}preview</h2>
        <Panel>
          {livePreview ? (
            <>
              <div className="t-label mb-2">
                {"// "}{Object.keys(livePreview).length} field
                {Object.keys(livePreview).length === 1 ? "" : "s"}
              </div>
              <ul className="text-[12px] font-mono text-[var(--color-fg-2)] flex flex-col gap-1">
                {Object.entries(livePreview).map(([name, rule]) => (
                  <li key={name} className="border-l-2 border-[var(--color-accent-dim)] pl-2">
                    <span className="text-[var(--color-fg-0)]">{name}</span>{" "}
                    <span className="text-[var(--color-fg-3)]">
                      :: {(rule as { type?: string }).type ?? "?"}
                      {(rule as { required?: boolean }).required ? " · required" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="text-[12px] text-[var(--color-danger)] font-mono">
              × invalid JSON
            </div>
          )}
        </Panel>
      </aside>
    </form>
  );
}
