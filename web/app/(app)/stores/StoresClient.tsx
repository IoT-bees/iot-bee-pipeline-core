"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, CircleCheck, Plus, RefreshCw, SearchX, Wifi } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { DeleteResourceDialog } from "@/components/ui/DeleteResourceDialog";
import { Panel } from "@/components/ui/Panel";
import { SearchInput } from "@/components/ui/ListFilters";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { useDeleteStore, useTestStore } from "@/lib/hooks/useStores";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import { storesApi } from "@/lib/api/endpoints/stores";
import { fmtId } from "@/lib/fmt";
import type { DataStore } from "@/lib/api/types";

export function StoresClient({ initialData }: { initialData?: DataStore[] }) {
  const { data, isError, isLoading, refetch } = useQuery({
    queryKey: ["stores"],
    queryFn: storesApi.list,
    initialData,
    staleTime: 30_000,
  });
  const del = useDeleteStore();
  const testStore = useTestStore();
  const confirmDelete = useConfirmDelete(del.mutateAsync);
  const [query, setQuery] = useState("");
  const [verification, setVerification] = useState<{
    id: number;
    ok: boolean;
    message: string;
  } | null>(null);
  const all = useMemo(() => data ?? [], [data]);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((s) =>
      [s.name, s.storeType, s.dataStoreDescription]
        .some((f) => (f ?? "").toLowerCase().includes(q)),
    );
  }, [all, query]);
  return (
    <div className="pb-4">
      <div className="flex flex-col gap-4 border-b border-[var(--color-border-subtle)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="t-label mb-2 text-[var(--color-accent-strong)]">Persistencia</p>
          <h1 className="t-title mb-2">Destinos de datos</h1>
          <p className="t-body">
            Configura y verifica el destino de los datos validados.
          </p>
        </div>
        {all.length > 0 && (
          <Link href="/stores/new" className="shrink-0">
            <Button variant="primary" className="min-h-11 gap-2">
              <Plus size={16} aria-hidden="true" />
              Crear destino
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-8">
      {isLoading ? (
        <HoneycombLoader label="Cargando destinos" />
      ) : isError ? (
        <Panel tone="danger" className="w-full" role="alert">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 shrink-0 text-[var(--color-danger)]" size={20} aria-hidden="true" />
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--color-fg-0)]">No pudimos cargar los destinos</h2>
              <p className="mt-1 text-[14px] leading-6 text-[var(--color-fg-2)]">
                Revisa tu conexión e inténtalo de nuevo.
              </p>
              <Button type="button" variant="ghost" className="mt-4 min-h-11 gap-2" onClick={() => void refetch()}>
                <RefreshCw size={16} aria-hidden="true" />
                Reintentar
              </Button>
            </div>
          </div>
        </Panel>
      ) : all.length === 0 ? (
        <Panel className="mx-auto flex min-h-[260px] max-w-2xl flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 grid size-12 place-items-center rounded-full border border-[var(--color-accent)] bg-[var(--color-bg-elev)] text-[var(--color-accent-strong)]">
            <Wifi size={22} aria-hidden="true" />
          </div>
          <h2 className="text-[18px] font-semibold text-[var(--color-fg-0)]">Aún no has creado destinos</h2>
          <p className="mt-2 max-w-md text-[14px] leading-6 text-[var(--color-fg-2)]">
            Crea uno para indicar dónde se almacenarán o enviarán los datos validados de tus proyectos.
          </p>
          <Link href="/stores/new" className="mt-5">
            <Button variant="primary" className="min-h-11 gap-2">
              <Plus size={16} aria-hidden="true" />
              Crear el primer destino
            </Button>
          </Link>
        </Panel>
      ) : list.length === 0 ? (
        <>
          <StoreToolbar query={query} onQueryChange={setQuery} />
          <Panel className="flex flex-col items-start gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <SearchX className="mt-0.5 shrink-0 text-[var(--color-fg-3)]" size={20} aria-hidden="true" />
              <div>
                <h2 className="text-[16px] font-semibold text-[var(--color-fg-0)]">No hay coincidencias</h2>
                <p className="mt-1 text-[14px] text-[var(--color-fg-2)]">Ningún destino coincide con “{query}”.</p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => setQuery("")}>Limpiar búsqueda</Button>
          </Panel>
        </>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <StoreToolbar query={query} onQueryChange={setQuery} />
          </div>
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
                {list.map((s) => (
                  <TR key={s.id}>
                    <TD>{fmtId(s.id)}</TD>
                    <TD>
                      <Link href={`/stores/${s.id}`} className="font-semibold text-[var(--color-fg-0)] hover:text-[var(--color-accent-strong)] hover:underline underline-offset-4">
                        {s.name}
                      </Link>
                    </TD>
                    <TD><StoreTypeLabel type={s.storeType} /></TD>
                    <TD className="max-w-[360px]">{s.dataStoreDescription || "—"}</TD>
                    <TD className="text-right">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Link href={`/stores/${s.id}`}>
                          <Button variant="ghost" size="sm">Ver</Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={testStore.isPending && testStore.variables === s.id}
                          onClick={() => {
                            setVerification(null);
                            testStore.mutate(s.id, {
                              onSuccess: (result) => setVerification({ id: s.id, ok: result.ok, message: result.message }),
                              onError: (requestError) => setVerification({
                                id: s.id,
                                ok: false,
                                message: requestError instanceof Error ? requestError.message : "No se pudo verificar el destino.",
                              }),
                            });
                          }}
                        >
                          {testStore.isPending && testStore.variables === s.id ? "Verificando…" : "Verificar"}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => confirmDelete.ask(s.id, s.name)}
                        >
                          Eliminar
                        </Button>
                      </div>
                      {verification?.id === s.id && !verification.ok && <VerificationFeedback result={verification} />}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="md:hidden flex flex-col gap-2">
            {list.map((s) => (
              <Panel key={s.id} className="p-4">
                <div className="mb-4">
                  <div className="t-label mb-1">Destino #{fmtId(s.id)}</div>
                  <Link href={`/stores/${s.id}`} className="text-[17px] font-semibold text-[var(--color-fg-0)] hover:text-[var(--color-accent-strong)] hover:underline underline-offset-4">
                    {s.name}
                  </Link>
                  <div className="mt-2"><StoreTypeLabel type={s.storeType} /></div>
                  <div className="mt-2 text-[14px] leading-6 text-[var(--color-fg-2)]">
                    {s.dataStoreDescription || "Sin descripción"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/stores/${s.id}`}>
                    <Button variant="ghost" size="sm" className="min-h-11">Ver</Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11"
                    disabled={testStore.isPending && testStore.variables === s.id}
                    onClick={() => {
                      setVerification(null);
                      testStore.mutate(s.id, {
                        onSuccess: (result) => setVerification({ id: s.id, ok: result.ok, message: result.message }),
                        onError: (requestError) => setVerification({
                          id: s.id,
                          ok: false,
                          message: requestError instanceof Error ? requestError.message : "No se pudo verificar el destino.",
                        }),
                      });
                    }}
                  >
                    {testStore.isPending && testStore.variables === s.id ? "Verificando…" : "Verificar"}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="min-h-11"
                    onClick={() => confirmDelete.ask(s.id, s.name)}
                  >
                    Eliminar
                  </Button>
                </div>
                {verification?.id === s.id && !verification.ok && <VerificationFeedback result={verification} />}
              </Panel>
            ))}
          </div>
        </>
      )}
      </div>

      <DeleteResourceDialog
        pending={confirmDelete.pending}
        resourceLabel="destino"
        impact="Los proyectos que escriben en este destino fallarán hasta que asignes otro."
        busy={del.isPending}
        error={confirmDelete.error}
        onConfirm={confirmDelete.confirm}
        onClose={confirmDelete.cancel}
      />
    </div>
  );
}

function StoreToolbar({ query, onQueryChange }: { query: string; onQueryChange: (value: string) => void }) {
  return <SearchInput value={query} onChange={onQueryChange} placeholder="Buscar destino" />;
}

function StoreTypeLabel({ type }: { type: DataStore["storeType"] }) {
  const labels = {
    INFLUX_DB: "InfluxDB",
    LOCAL_LOG: "Registro local",
    WEBHOOK: "Webhook",
  } as const;
  return <span className="inline-flex rounded-[2px] border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-fg-2)]">{labels[type]}</span>;
}

function VerificationFeedback({ result }: { result: { ok: boolean; message: string } }) {
  return (
    <div
      className={`mt-2 inline-flex max-w-full items-start gap-1.5 text-left text-[12px] leading-5 ${result.ok ? "text-[var(--color-online)]" : "text-[var(--color-danger)]"}`}
      role="status"
      aria-live="polite"
    >
      {result.ok ? <CircleCheck size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> : <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />}
      <span>{result.message}</span>
    </div>
  );
}
