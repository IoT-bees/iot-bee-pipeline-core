"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Plus, RefreshCw, SearchX, Radio } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { DeleteResourceDialog } from "@/components/ui/DeleteResourceDialog";
import { Panel } from "@/components/ui/Panel";
import { SearchInput } from "@/components/ui/ListFilters";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { useDeleteSource, useTestSource } from "@/lib/hooks/useSources";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import { sourcesApi } from "@/lib/api/endpoints/sources";
import { fmtId } from "@/lib/fmt";
import type { DataSource } from "@/lib/api/types";

export function SourcesClient({ initialData }: { initialData?: DataSource[] }) {
  const { data, error, isError, isLoading, refetch } = useQuery({
    queryKey: ["sources"],
    queryFn: sourcesApi.list,
    initialData,
    staleTime: 30_000,
  });
  const del = useDeleteSource();
  const testSource = useTestSource();
  const confirmDelete = useConfirmDelete(del.mutateAsync);
  const [query, setQuery] = useState("");
  const all = useMemo(() => data ?? [], [data]);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((s) =>
      [s.name, s.sourceType, s.dataSourceDescription]
        .some((f) => (f ?? "").toLowerCase().includes(q)),
    );
  }, [all, query]);

  return (
    <div className="pb-4">
      <div className="flex flex-col gap-4 border-b border-[var(--color-border-subtle)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="t-label mb-2 text-[var(--color-accent-strong)]">Entrada de datos</p>
          <h1 className="t-title mb-2">Brokers</h1>
          <p className="t-body">
            Conexiones que reciben la telemetría de las instalaciones de tus clientes.
          </p>
        </div>
        {all.length > 0 && (
          <Link href="/sources/new" className="shrink-0">
            <Button variant="primary" className="min-h-11 gap-2">
              <Plus size={16} aria-hidden="true" />
              Crear broker
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-8">
      {isLoading ? (
        <HoneycombLoader label="Cargando brokers" />
      ) : isError ? (
        <Panel tone="danger" className="max-w-2xl" role="alert">
          <div className="flex items-start gap-3">
            <CircleAlert
              className="mt-0.5 shrink-0 text-[var(--color-danger)]"
              size={20}
              aria-hidden="true"
            />
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--color-fg-0)]">
                No pudimos cargar los brokers
              </h2>
              <p className="mt-1 text-[14px] leading-6 text-[var(--color-fg-2)]">
                Comprueba la conexión con la API e inténtalo de nuevo.
                {error instanceof Error && error.message ? ` ${error.message}` : ""}
              </p>
              <Button
                type="button"
                variant="ghost"
                className="mt-4 min-h-11 gap-2"
                onClick={() => void refetch()}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Reintentar
              </Button>
            </div>
          </div>
        </Panel>
      ) : all.length === 0 ? (
        <Panel className="mx-auto flex min-h-[260px] max-w-2xl flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 grid size-12 place-items-center rounded-full border border-[var(--color-accent)] bg-[var(--color-bg-elev)] text-[var(--color-accent-strong)]">
            <Radio size={22} aria-hidden="true" />
          </div>
          <h2 className="text-[18px] font-semibold text-[var(--color-fg-0)]">
            Crea la conexión que recibirá tu telemetría
          </h2>
          <p className="mt-2 max-w-md text-[14px] leading-6 text-[var(--color-fg-2)]">
            Configura un broker RabbitMQ, MQTT o Kafka antes de crear un proyecto.
          </p>
          <Link href="/sources/new" className="mt-5">
            <Button variant="primary" className="min-h-11 gap-2">
              <Plus size={16} aria-hidden="true" />
              Crear el primer broker
            </Button>
          </Link>
        </Panel>
      ) : (
        <>
          {list.length === 0 ? (
            <>
              <div className="mb-4 flex justify-end">
                <SourceToolbar query={query} onQueryChange={setQuery} />
              </div>
              <Panel className="flex flex-col items-start gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <SearchX
                    className="mt-0.5 shrink-0 text-[var(--color-fg-3)]"
                    size={20}
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="text-[16px] font-semibold text-[var(--color-fg-0)]">
                      No hay coincidencias
                    </h2>
                    <p className="mt-1 text-[14px] text-[var(--color-fg-2)]">
                      Ningún broker coincide con “{query}”.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11"
                  onClick={() => setQuery("")}
                >
                  Limpiar búsqueda
                </Button>
              </Panel>
            </>
          ) : (
            <>
              <div className="mb-4 flex justify-end">
                <SourceToolbar query={query} onQueryChange={setQuery} />
              </div>
              <SourceList
                sources={list}
                testSource={testSource}
                onVerify={testSource.mutate}
                onDelete={confirmDelete.ask}
              />
            </>
          )}
        </>
      )}
      </div>

      <DeleteResourceDialog
        pending={confirmDelete.pending}
        resourceLabel="broker"
        impact="Los proyectos que usan este broker perderán la conexión y dejarán de procesar."
        busy={del.isPending}
        error={confirmDelete.error}
        onConfirm={confirmDelete.confirm}
        onClose={confirmDelete.cancel}
      />
    </div>
  );
}

function SourceToolbar({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return <SearchInput value={query} onChange={onQueryChange} placeholder="Buscar broker" />;
}

function SourceList({
  sources,
  testSource,
  onVerify,
  onDelete,
}: {
  sources: DataSource[];
  testSource: { isPending: boolean; variables: number | undefined };
  onVerify: (sourceId: number) => void;
  onDelete: (sourceId: number, name: string) => void;
}) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <THead>
            <TH>#</TH>
            <TH>NOMBRE</TH>
            <TH>TIPO</TH>
            <TH>DESCRIPCIÓN</TH>
            <TH className="text-right">ACCIONES</TH>
          </THead>
          <tbody>
            {sources.map((source) => (
              <TR key={source.id}>
                <TD>{fmtId(source.id)}</TD>
                <TD>
                  <Link
                    href={`/sources/${source.id}`}
                    className="font-semibold text-[var(--color-fg-0)] hover:text-[var(--color-accent-strong)] hover:underline underline-offset-4"
                  >
                    {source.name}
                  </Link>
                </TD>
                <TD><SourceTypeLabel type={source.sourceType} /></TD>
                <TD className="max-w-[360px]">{source.dataSourceDescription || "—"}</TD>
                <TD className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link href={`/sources/${source.id}`}>
                      <Button variant="ghost" size="sm">Ver</Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={testSource.isPending && testSource.variables === source.id}
                      onClick={() => onVerify(source.id)}
                    >
                      {testSource.isPending && testSource.variables === source.id
                        ? "Verificando…"
                        : "Verificar"}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDelete(source.id, source.name)}
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
        {sources.map((source) => (
          <Panel key={source.id} className="p-4">
            <div className="mb-4">
              <div className="t-label mb-1">Broker #{fmtId(source.id)}</div>
              <Link
                href={`/sources/${source.id}`}
                className="text-[17px] font-semibold text-[var(--color-fg-0)] hover:text-[var(--color-accent-strong)] hover:underline underline-offset-4"
              >
                {source.name}
              </Link>
              <div className="mt-2"><SourceTypeLabel type={source.sourceType} /></div>
              <div className="mt-2 text-[14px] leading-6 text-[var(--color-fg-2)]">
                {source.dataSourceDescription || "Sin descripción"}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/sources/${source.id}`}>
                <Button variant="ghost" size="sm" className="min-h-11">Ver</Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11"
                disabled={testSource.isPending && testSource.variables === source.id}
                onClick={() => onVerify(source.id)}
              >
                {testSource.isPending && testSource.variables === source.id
                  ? "Verificando…"
                  : "Verificar"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="min-h-11"
                onClick={() => onDelete(source.id, source.name)}
              >
                Eliminar
              </Button>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}

function SourceTypeLabel({ type }: { type: DataSource["sourceType"] }) {
  const labels = {
    RABBIT_MQ: "RabbitMQ",
    MQTT: "MQTT",
    KAFKA: "Kafka",
  } as const;
  return (
    <span className="inline-flex rounded-[2px] border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-fg-2)]">
      {labels[type]}
    </span>
  );
}
