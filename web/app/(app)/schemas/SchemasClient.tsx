"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { DeleteResourceDialog } from "@/components/ui/DeleteResourceDialog";
import { Panel } from "@/components/ui/Panel";
import { SearchInput } from "@/components/ui/ListFilters";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { useDeleteSchema } from "@/lib/hooks/useSchemas";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import { schemasApi } from "@/lib/api/endpoints/schemas";
import { fmtId } from "@/lib/fmt";
import type { ValidationSchema } from "@/lib/api/types";

export function SchemasClient({ initialData }: { initialData?: ValidationSchema[] }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["schemas"],
    queryFn: schemasApi.list,
    initialData,
    staleTime: 30_000,
  });
  const del = useDeleteSchema();
  const confirmDelete = useConfirmDelete(del.mutateAsync);
  const [query, setQuery] = useState("");
  const all = useMemo(() => data ?? [], [data]);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((s) => {
      const fields = Object.keys(s.schema ?? {}).join(" ");
      return [s.name, fields].some((f) => f.toLowerCase().includes(q));
    });
  }, [all, query]);
  return (
    <div className="pb-4">
      <div className="flex flex-col gap-4 border-b border-[var(--color-border-subtle)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="t-label mb-2 text-[var(--color-accent-strong)]">Validación de telemetría</p>
          <h1 className="t-title mb-2">Reglas de datos</h1>
          <p className="t-body max-w-[650px]">
            Define los campos y reglas de tus proyectos.
          </p>
        </div>
        <Link href="/schemas/new" className="shrink-0">
          <Button variant="primary" className="w-full gap-2 sm:w-auto">
            <Plus size={16} aria-hidden="true" />
            Crear definición
          </Button>
        </Link>
      </div>

      <div className="mt-8">
      {isLoading ? (
        <HoneycombLoader label="Cargando definiciones" />
      ) : isError ? (
        <Panel tone="danger" className="max-w-[640px]">
          <h2 className="text-[16px] font-semibold text-[var(--color-fg-0)]">No pudimos cargar las definiciones</h2>
          <p className="mt-1 text-[14px] text-[var(--color-fg-2)]">
            {error instanceof Error ? error.message : "Comprueba tu conexión e inténtalo de nuevo."}
          </p>
          <Button type="button" variant="ghost" size="sm" className="mt-4" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? "Reintentando…" : "Reintentar"}
          </Button>
        </Panel>
      ) : all.length === 0 ? (
        <Panel tone="accent" className="max-w-[640px] py-6">
          <h2 className="text-[18px] font-semibold text-[var(--color-fg-0)]">Crea tu primera definición</h2>
          <p className="mt-1 max-w-[520px] text-[14px] leading-6 text-[var(--color-fg-2)]">
            Agrupa los campos y reglas que reutilizarán tus proyectos. Puedes empezar con un ejemplo y ajustarlo después.
          </p>
          <Link href="/schemas/new" className="mt-4 inline-flex">
            <Button variant="primary" className="gap-2">
              <Plus size={16} aria-hidden="true" />
              Crear definición
            </Button>
          </Link>
        </Panel>
      ) : list.length === 0 ? (
        <>
          <div className="mb-4 flex justify-end">
            <SchemasToolbar query={query} onQueryChange={setQuery} />
          </div>
          <Panel className="max-w-[640px]">
            <h2 className="text-[16px] font-semibold text-[var(--color-fg-0)]">No hay coincidencias</h2>
            <p className="mt-1 text-[14px] text-[var(--color-fg-2)]">Prueba con otro nombre o campo, o limpia la búsqueda.</p>
            <Button type="button" variant="ghost" size="sm" className="mt-4" onClick={() => setQuery("")}>
              Limpiar búsqueda
            </Button>
          </Panel>
        </>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <SchemasToolbar query={query} onQueryChange={setQuery} />
          </div>
          <div className="hidden md:block">
            <Table>
              <THead>
                <TH className="w-[92px]">#</TH>
                <TH>NOMBRE</TH>
                <TH className="w-[160px]">CAMPOS</TH>
                <TH className="text-right">ACCIONES</TH>
              </THead>
              <tbody>
                {list.map((s) => (
                  <TR key={s.id}>
                    <TD>{fmtId(s.id)}</TD>
                    <TD className="font-semibold text-[var(--color-fg-0)]">{s.name}</TD>
                    <TD>{Object.keys(s.schema ?? {}).length} campo{Object.keys(s.schema ?? {}).length === 1 ? "" : "s"}</TD>
                    <TD className="text-right">
                      <div className="flex gap-1.5 justify-end">
                        <Link href={`/schemas/${s.id}`}>
                          <Button variant="ghost" size="sm">Ver</Button>
                        </Link>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => confirmDelete.ask(s.id, s.name)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="md:hidden flex flex-col gap-2">
            {list.map((s) => (
              <Panel key={s.id}>
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0">
                    <div className="t-label">#{fmtId(s.id)}</div>
                    <div className="break-words font-semibold text-[var(--color-fg-0)]">{s.name}</div>
                    <div className="mt-1 text-[13px] text-[var(--color-fg-3)]">{Object.keys(s.schema ?? {}).length} campo{Object.keys(s.schema ?? {}).length === 1 ? "" : "s"}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/schemas/${s.id}`}>
                    <Button variant="ghost" size="sm">Ver</Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => confirmDelete.ask(s.id, s.name)}
                  >
                    Eliminar
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
        </>
      )}
      </div>

      <DeleteResourceDialog
        pending={confirmDelete.pending}
        resourceLabel="definición de datos"
        impact="Los proyectos que usan esta definición fallarán la validación hasta que asignes una nueva."
        busy={del.isPending}
        error={confirmDelete.error}
        onConfirm={confirmDelete.confirm}
        onClose={confirmDelete.cancel}
      />
    </div>
  );
}

function SchemasToolbar({ query, onQueryChange }: { query: string; onQueryChange: (value: string) => void }) {
  return <SearchInput value={query} onChange={onQueryChange} placeholder="Buscar definición" />;
}
