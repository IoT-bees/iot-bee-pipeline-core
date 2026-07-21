"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { sourcesApi } from "@/lib/api/endpoints/sources";
import { storesApi } from "@/lib/api/endpoints/stores";
import { schemasApi } from "@/lib/api/endpoints/schemas";
import { groupsApi } from "@/lib/api/endpoints/groups";
import { canStop } from "@/lib/status";

type FieldKind = "source" | "store" | "schema" | "group";

const FIELD_LABELS: Record<FieldKind, string> = {
  source: "conexión",
  store: "destino",
  schema: "esquema",
  group: "grupo de cliente",
};

interface Props {
  label: FieldKind;
  currentId: number | undefined;
  onChange: (newId: number) => Promise<void>;
  pipelineStatus: string | undefined;
}

interface Option {
  id: number;
  name: string;
}

function useOptions(label: FieldKind, enabled: boolean) {
  const sources = useQuery<Option[]>({
    queryKey: ["sources"],
    queryFn: sourcesApi.list,
    enabled: enabled && label === "source",
    staleTime: 30_000,
  });
  const stores = useQuery<Option[]>({
    queryKey: ["stores"],
    queryFn: storesApi.list,
    enabled: enabled && label === "store",
    staleTime: 30_000,
  });
  const schemas = useQuery<Option[]>({
    queryKey: ["schemas"],
    queryFn: schemasApi.list,
    enabled: enabled && label === "schema",
    staleTime: 30_000,
  });
  const groups = useQuery<Option[]>({
    queryKey: ["groups"],
    queryFn: groupsApi.list,
    enabled: enabled && label === "group",
    staleTime: 30_000,
  });
  if (label === "source") return sources;
  if (label === "store") return stores;
  if (label === "schema") return schemas;
  return groups;
}

export function EditFieldButton({
  label,
  currentId,
  onChange,
  pipelineStatus,
}: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<number | undefined>(currentId);
  const [busy, setBusy] = useState(false);
  const blocked = canStop(pipelineStatus);
  const optionsQuery = useOptions(label, open);
  const options = optionsQuery.data ?? [];
  const displayLabel = FIELD_LABELS[label];

  function handleOpen() {
    setValue(currentId);
    setOpen(true);
  }

  async function handleApply() {
    if (value === undefined || value === currentId) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      await onChange(value);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="text-[11px] text-[var(--color-fg-3)] hover:text-[var(--color-accent)] underline-offset-2 hover:underline"
      >
        Editar
      </button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="p-5">
          <h3 className="t-section mb-3">{`Editar ${displayLabel}`}</h3>
          {blocked && (
            <div className="mb-3 text-[12px] text-[var(--color-danger)]">
              Este proyecto está activo. Deténlo antes de realizar cambios.
            </div>
          )}
          <Select
            value={value === undefined ? "" : String(value)}
            onChange={(e) => setValue(Number(e.target.value))}
            disabled={blocked || optionsQuery.isPending}
          >
            <option value="" disabled>
              {optionsQuery.isPending ? "Cargando..." : "Selecciona una opción"}
            </option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-2 mt-4 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleApply}
              disabled={busy || blocked}
            >
              Aplicar cambios
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
