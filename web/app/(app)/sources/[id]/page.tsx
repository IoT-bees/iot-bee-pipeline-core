"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DataSourceForm } from "@/components/forms/DataSourceForm";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { useSource, useUpdateSource } from "@/lib/hooks/useSources";
import { fmtId } from "@/lib/fmt";
import type { SourceInput } from "@/lib/schemas/source";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 items-baseline text-[13px] font-mono">
      <div className="text-[var(--color-fg-3)] uppercase">{label}</div>
      <div className="text-[var(--color-fg-1)] break-words">{value}</div>
    </div>
  );
}

export default function ViewSourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  const { data, isLoading } = useSource(numericId);
  const update = useUpdateSource(numericId);
  const [editing, setEditing] = useState(false);
  if (isLoading || !data) return <HoneycombLoader />;

  let connection: React.ReactNode = null;
  if (data.sourceType === "RABBIT_MQ") {
    const c = data.config as { url?: string; queue_name?: string; consumer_name?: string };
    connection = (
      <>
        <Row label="url" value={c.url ?? "—"} />
        <Row label="Nombre de la cola" value={c.queue_name ?? "—"} />
        <Row label="Nombre del consumidor" value={c.consumer_name ?? "—"} />
      </>
    );
  } else if (data.sourceType === "MQTT") {
    const c = data.config as { broker_url?: string; topic?: string; client_id?: string };
    connection = (
      <>
        <Row label="URL del broker" value={c.broker_url ?? "—"} />
        <Row label="Tópico" value={c.topic ?? "—"} />
        <Row label="ID del cliente" value={c.client_id ?? "—"} />
      </>
    );
  } else if (data.sourceType === "KAFKA") {
    const c = data.config as { brokers?: string[]; topic?: string; group_id?: string };
    connection = (
      <>
        <Row label="Brokers" value={(c.brokers ?? []).join(", ") || "—"} />
        <Row label="Tópico" value={c.topic ?? "—"} />
        <Row label="ID del grupo" value={c.group_id ?? "—"} />
      </>
    );
  }

  let configForForm: SourceInput["config"];
  if (data.sourceType === "KAFKA") {
    const c = data.config as { brokers?: string[]; topic?: string; group_id?: string };
    configForForm = {
      sourceType: "KAFKA",
      brokers: (c.brokers ?? []).join(", "),
      topic: c.topic ?? "",
      group_id: c.group_id ?? "",
    };
  } else if (data.sourceType === "MQTT") {
    const c = data.config as { broker_url?: string; topic?: string; client_id?: string };
    configForForm = {
      sourceType: "MQTT",
      broker_url: c.broker_url ?? "",
      topic: c.topic ?? "",
      client_id: c.client_id ?? "",
    };
  } else {
    const c = data.config as { url?: string; queue_name?: string; consumer_name?: string };
    configForForm = {
      sourceType: "RABBIT_MQ",
      url: c.url ?? "",
      queue_name: c.queue_name ?? "",
      consumer_name: c.consumer_name ?? "",
    };
  }

  return (
    <div>
      <Breadcrumbs
        trail={[
          { label: "Conexiones", href: "/sources" },
          { label: data.name },
        ]}
      />
      <h1 className="t-title mb-1">{data.name}</h1>
      <p className="text-sm text-[var(--color-fg-3)] mb-4">
        Conexión #{fmtId(data.id)} · {data.sourceType}
      </p>

      <div className="flex gap-3 items-center mb-6 flex-wrap">
        <Link href="/sources">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft size={14} aria-hidden="true" />
            Volver
          </Button>
        </Link>
        {!editing && (
          <Button variant="primary" size="sm" onClick={() => setEditing(true)}>
            Editar
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Panel>
          <div className="t-label mb-3">INFORMACIÓN</div>
          <div className="flex flex-col gap-2">
            <Row label="Identificador" value={`#${data.id}`} />
            <Row label="Nombre" value={data.name} />
            <Row label="Tipo de broker" value={data.sourceType} />
            <Row label="Descripción" value={data.dataSourceDescription || "—"} />
          </div>
        </Panel>
        <Panel>
          <div className="t-label mb-3">CONEXIÓN</div>
          <div className="flex flex-col gap-2">{connection}</div>
        </Panel>
      </div>

      {editing && (
        <section className="mt-8 border-t border-[var(--color-border-subtle)] pt-6">
          <div className="mb-5">
            <div className="t-label mb-1 text-[var(--color-accent-strong)]">EDITAR CONEXIÓN</div>
            <p className="t-body">Actualiza los datos del broker y guarda los cambios.</p>
          </div>
          <DataSourceForm
            defaultValues={{
              name: data.name,
              description: data.dataSourceDescription,
              config: configForForm,
            }}
            submitLabel="Guardar cambios"
            submitting={update.isPending}
            submitError={update.error instanceof Error ? update.error.message : null}
            showRequiredHint={false}
            showActionSeparator
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
