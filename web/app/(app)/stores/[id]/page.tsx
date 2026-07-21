"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CircleAlert, CircleCheck, RefreshCw, Wifi } from "lucide-react";

import { DataStoreForm } from "@/components/forms/DataStoreForm";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { useStore, useTestStore, useUpdateStore } from "@/lib/hooks/useStores";
import { fmtId } from "@/lib/fmt";
import type { StoreInput } from "@/lib/schemas/store";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 text-[14px] font-mono sm:grid-cols-[160px_1fr] sm:gap-3 sm:items-baseline">
      <div className="text-[var(--color-fg-3)] uppercase">{label}</div>
      <div className="text-[var(--color-fg-1)] break-words">{value}</div>
    </div>
  );
}

function authenticationStatus(token: string | undefined): string {
  return token ? "Configurada" : "No configurada";
}

function storeTypeLabel(type: string): string {
  if (type === "INFLUX_DB") return "InfluxDB";
  if (type === "LOCAL_LOG") return "Registro local";
  return "Webhook";
}

export default function ViewStorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  const { data, isError, isLoading, refetch } = useStore(numericId);
  const testStore = useTestStore();
  const update = useUpdateStore(numericId);
  const [verification, setVerification] = useState<{ ok: boolean; message: string } | null>(null);
  const [editing, setEditing] = useState(false);
  if (isLoading) return <HoneycombLoader label="Cargando destino" />;
  if (isError || !data) {
    return (
      <div className="max-w-2xl">
        <Breadcrumbs trail={[{ label: "Destinos de datos", href: "/stores" }, { label: "Destino no disponible" }]} />
        <Panel tone="danger" role="alert">
          <div>
            <h1 className="text-[18px] font-semibold text-[var(--color-fg-0)]">No pudimos cargar este destino</h1>
            <p className="mt-2 text-[14px] leading-6 text-[var(--color-fg-2)]">
              Es posible que se haya eliminado o que la conexión con la API haya fallado.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" variant="ghost" className="min-h-11 gap-2" onClick={() => void refetch()}>
                <RefreshCw size={16} aria-hidden="true" />
                Reintentar
              </Button>
              <Link href="/stores">
                <Button type="button" variant="primary" className="min-h-11 gap-2">
                  <ArrowLeft size={16} aria-hidden="true" />
                  Volver
                </Button>
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    );
  }
  let persistence: React.ReactNode = null;
  if (data.storeType === "INFLUX_DB") {
    const c = data.config as {
      url?: string;
      data_base?: string;
      measurement?: string;
      token?: string;
      tag_fields?: string[];
    };
    persistence = (
      <>
        <Row label="url" value={c.url ?? "—"} />
        <Row label="Base de datos" value={c.data_base ?? "—"} />
        <Row label="Medición" value={c.measurement ?? "—"} />
        <Row label="Autenticación" value={authenticationStatus(c.token)} />
        <Row label="Campos de etiqueta" value={(c.tag_fields ?? []).join(", ") || "—"} />
      </>
    );
  } else if (data.storeType === "LOCAL_LOG") {
    const c = data.config as { log_name?: string };
    persistence = <Row label="Nombre del registro" value={c.log_name ?? "—"} />;
  } else if (data.storeType === "WEBHOOK") {
    const c = data.config as { url?: string; bearer_token?: string };
    persistence = (
      <>
        <Row label="URL del endpoint" value={c.url ?? "—"} />
        <Row label="Autorización" value={authenticationStatus(c.bearer_token)} />
        <Row label="Entrega" value="POST application/json" />
      </>
    );
  }

  let configForForm: StoreInput["config"];
  if (data.storeType === "INFLUX_DB") {
    const c = data.config as {
      url?: string;
      data_base?: string;
      measurement?: string;
      token?: string;
      tag_fields?: string[];
    };
    configForForm = {
      persistenceType: "INFLUX_DB",
      url: c.url ?? "",
      data_base: c.data_base ?? "",
      measurement: c.measurement ?? "",
      token: c.token ?? "",
      tag_fields: (c.tag_fields ?? []).join(", "),
    };
  } else if (data.storeType === "WEBHOOK") {
    const c = data.config as { url?: string; bearer_token?: string };
    configForForm = {
      persistenceType: "WEBHOOK",
      url: c.url ?? "",
      bearer_token: c.bearer_token ?? "",
    };
  } else {
    const c = data.config as { log_name?: string };
    configForForm = {
      persistenceType: "LOCAL_LOG",
      log_name: c.log_name ?? "",
    };
  }

  return (
    <div className="pb-4">
      <Breadcrumbs
        trail={[
          { label: "Destinos de datos", href: "/stores" },
          { label: data.name },
        ]}
      />
      <h1 className="t-title mb-1">{data.name}</h1>
      <p className="text-sm text-[var(--color-fg-3)] mb-5">
        Destino #{fmtId(data.id)} · {storeTypeLabel(data.storeType)}
      </p>

      <div className="flex gap-3 items-center mb-6 flex-wrap">
        <Link href="/stores">
          <Button variant="ghost" className="min-h-11 gap-2">
            <ArrowLeft size={16} aria-hidden="true" />
            Volver
          </Button>
        </Link>
        {!editing && (
          <Button
            type="button"
            variant="primary"
            className="min-h-11"
            onClick={() => setEditing(true)}
          >
            Editar
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Panel>
          <div className="t-label mb-3">INFORMACIÓN</div>
          <div className="flex flex-col gap-2">
            <Row label="Identificador" value={`#${data.id}`} />
            <Row label="Nombre" value={data.name} />
            <Row label="Tipo de destino" value={storeTypeLabel(data.storeType)} />
            <Row label="Descripción" value={data.dataStoreDescription || "—"} />
          </div>
        </Panel>
        <Panel>
          <div className="t-label mb-3">CONFIGURACIÓN</div>
          <div className="flex flex-col gap-2">{persistence}</div>
        </Panel>
        <Panel className="md:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] text-[var(--color-accent-strong)]">
                <Wifi size={18} aria-hidden="true" />
              </div>
              <div>
                <div className="t-label mb-1">COMPROBACIÓN DE CONEXIÓN</div>
                <p className="text-[14px] leading-6 text-[var(--color-fg-2)]">Ejecuta una comprobación en tiempo real antes de asignar este destino a un proyecto.</p>
              </div>
            </div>
            <Button
              type="button"
              variant="primary"
              className="min-h-11 shrink-0"
              disabled={testStore.isPending}
              onClick={() => {
                setVerification(null);
                testStore.mutate(data.id, {
                  onSuccess: (result) => setVerification({ ok: result.ok, message: result.message }),
                  onError: (requestError) => setVerification({
                    ok: false,
                    message: requestError instanceof Error ? requestError.message : "No se pudo verificar el destino.",
                  }),
                });
              }}
            >
              {testStore.isPending ? "Verificando…" : "Verificar conexión"}
            </Button>
          </div>
          {verification && (
            <div className={`mt-4 flex items-start gap-2 border-t pt-4 text-[14px] leading-6 ${verification.ok ? "border-[var(--color-online)] text-[var(--color-online)]" : "border-[var(--color-danger)] text-[var(--color-danger)]"}`} role="status" aria-live="polite">
              {verification.ok ? <CircleCheck className="mt-0.5 shrink-0" size={18} aria-hidden="true" /> : <CircleAlert className="mt-0.5 shrink-0" size={18} aria-hidden="true" />}
              <span>{verification.message}</span>
            </div>
          )}
        </Panel>
      </div>

      {editing && (
        <section className="mt-8 border-t border-[var(--color-border-subtle)] pt-6">
          <div className="mb-5">
            <div className="t-label mb-1 text-[var(--color-accent-strong)]">EDITAR DESTINO</div>
            <p className="t-body">Actualiza la configuración y guarda los cambios.</p>
          </div>
          <DataStoreForm
            defaultValues={{
              name: data.name,
              description: data.dataStoreDescription,
              config: configForForm,
            }}
            submitLabel="Guardar cambios"
            submitting={update.isPending}
            showRequiredHint={false}
            onCancel={() => setEditing(false)}
            onSubmit={async (payload) => {
              await update.mutateAsync(payload);
              setEditing(false);
            }}
          />
        </section>
      )}
    </div>
  );
}
