"use client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { AuditFilters as Filters } from "@/lib/api/types";

interface Props {
  value: Filters;
  onChange: (next: Filters) => void;
}

export function AuditFilters({ value, onChange }: Props) {
  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[var(--color-fg-2)]">Refina el historial por ruta, método, resultado o usuario.</p>
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange({})} disabled={Object.keys(value).length === 0}>
          Limpiar filtros
        </Button>
      </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div>
        <label className="block text-[10px] uppercase text-[var(--color-fg-4)] mb-1">
          Ruta contiene
        </label>
        <Input
          value={value.pathContains ?? ""}
          onChange={(e) =>
            onChange({ ...value, pathContains: e.target.value || undefined })
          }
          placeholder="/api/v1/pipelines"
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase text-[var(--color-fg-4)] mb-1">
          Método
        </label>
        <Select
          value={value.method ?? ""}
          onChange={(e) =>
            onChange({ ...value, method: e.target.value || undefined })
          }
        >
          <option value="">cualquiera</option>
          <option value="POST">POST</option>
          <option value="PATCH">PATCH</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </Select>
      </div>
      <div>
        <label className="block text-[10px] uppercase text-[var(--color-fg-4)] mb-1">
          Estado
        </label>
        <Select
          value={value.status?.toString() ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              status: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        >
          <option value="">cualquiera</option>
          <option value="200">200</option>
          <option value="201">201</option>
          <option value="204">204</option>
          <option value="400">400</option>
          <option value="403">403</option>
          <option value="404">404</option>
          <option value="409">409</option>
          <option value="500">500</option>
        </Select>
      </div>
      <div>
        <label className="block text-[10px] uppercase text-[var(--color-fg-4)] mb-1">
          ID de usuario
        </label>
        <Input
          type="number"
          value={value.userId?.toString() ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              userId: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>
    </div>
    </div>
  );
}
