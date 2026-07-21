"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { fromBackend } from "@/lib/ast/serialize";
import { printFormula } from "@/lib/ast/printFormula";
import type { DataSource, DataStore, FieldSchema, ValidationSchema } from "@/lib/api/types";
import type { SlotKind } from "./canvas/types";

interface Props {
  kind: SlotKind | null;
  source?: DataSource;
  schema?: ValidationSchema;
  store?: DataStore;
  loading: boolean;
  onClose: () => void;
}

const TITLE: Record<SlotKind, string> = {
  source: "DETALLE DE CONEXIÓN",
  schema: "DETALLE DE ESQUEMA",
  store: "DETALLE DE DESTINO",
};

export function PipelineResourceDetailsModal({
  kind,
  source,
  schema,
  store,
  loading,
  onClose,
}: Props) {
  const resource = kind === "source" ? source : kind === "schema" ? schema : kind === "store" ? store : undefined;

  return (
    <Modal open={kind !== null} onClose={onClose} className="max-w-[640px]">
      <div className="border-b border-[var(--color-accent)] p-4">
        <div className="t-label">{kind ? TITLE[kind] : "DETALLE"}</div>
        <p className="mt-1 text-[14px] font-bold text-[var(--color-fg-0)]">
          {resource?.name ?? "Recurso configurado"}
        </p>
        <p className="mt-1 text-[12px] text-[var(--color-fg-3)]">
          Este es el recurso asignado actualmente a este paso del flujo.
        </p>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-4 font-mono text-[12px]">
        {loading ? (
          <p className="text-[var(--color-fg-3)]">Cargando configuración…</p>
        ) : kind === "source" && source ? (
          <SourceDetails source={source} />
        ) : kind === "schema" && schema ? (
          <SchemaDetails schema={schema} />
        ) : kind === "store" && store ? (
          <StoreDetails store={store} />
        ) : (
          <p className="text-[var(--color-danger)]">No pudimos cargar la configuración de este recurso.</p>
        )}
      </div>

      <div className="flex justify-end border-t border-[var(--color-border)] p-3">
        <Button autoFocus variant="ghost" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}

function SourceDetails({ source }: { source: DataSource }) {
  const config = source.config;

  return (
    <div className="flex flex-col gap-5">
      <Section title="RECURSO">
        <Row label="Identificador" value={`#${source.id}`} />
        <Row label="Tipo de broker" value={sourceTypeLabel(source.sourceType)} />
        <Row label="Descripción" value={source.dataSourceDescription || "—"} />
      </Section>
      <Section title="CONEXIÓN">
        {source.sourceType === "RABBIT_MQ" && (
          <>
            <Row label="URL" value={redactUrl((config as { url?: string }).url)} />
            <Row label="Cola" value={(config as { queue_name?: string }).queue_name ?? "—"} />
            <Row label="Consumidor" value={(config as { consumer_name?: string }).consumer_name ?? "—"} />
          </>
        )}
        {source.sourceType === "MQTT" && (
          <>
            <Row label="URL del broker" value={redactUrl((config as { broker_url?: string }).broker_url)} />
            <Row label="Tópico" value={(config as { topic?: string }).topic ?? "—"} />
            <Row label="ID del cliente" value={(config as { client_id?: string }).client_id ?? "—"} />
          </>
        )}
        {source.sourceType === "KAFKA" && (
          <>
            <Row label="Brokers" value={(config as { brokers?: string[] }).brokers?.join(", ") || "—"} />
            <Row label="Tópico" value={(config as { topic?: string }).topic ?? "—"} />
            <Row label="ID del grupo" value={(config as { group_id?: string }).group_id ?? "—"} />
          </>
        )}
      </Section>
    </div>
  );
}

function StoreDetails({ store }: { store: DataStore }) {
  const config = store.config;

  return (
    <div className="flex flex-col gap-5">
      <Section title="RECURSO">
        <Row label="Identificador" value={`#${store.id}`} />
        <Row label="Tipo de destino" value={storeTypeLabel(store.storeType)} />
        <Row label="Descripción" value={store.dataStoreDescription || "—"} />
      </Section>
      <Section title="CONFIGURACIÓN">
        {store.storeType === "INFLUX_DB" && (
          <>
            <Row label="URL" value={redactUrl((config as { url?: string }).url)} />
            <Row label="Base de datos" value={(config as { data_base?: string }).data_base ?? "—"} />
            <Row label="Medición" value={(config as { measurement?: string }).measurement ?? "—"} />
            <Row label="Autenticación" value={(config as { token?: string }).token ? "Configurada" : "No configurada"} />
            <Row label="Campos de etiqueta" value={(config as { tag_fields?: string[] }).tag_fields?.join(", ") || "—"} />
          </>
        )}
        {store.storeType === "LOCAL_LOG" && (
          <Row label="Nombre del registro" value={(config as { log_name?: string }).log_name ?? "—"} />
        )}
        {store.storeType === "WEBHOOK" && (
          <>
            <Row label="URL del endpoint" value={redactUrl((config as { url?: string }).url)} />
            <Row label="Autorización" value={(config as { bearer_token?: string }).bearer_token ? "Configurada" : "No configurada"} />
            <Row label="Entrega" value="POST application/json" />
          </>
        )}
      </Section>
    </div>
  );
}

function SchemaDetails({ schema }: { schema: ValidationSchema }) {
  const fields = Object.entries(schema.schema);

  return (
    <div className="flex flex-col gap-5">
      <Section title="RECURSO">
        <Row label="Identificador" value={`#${schema.id}`} />
        <Row label="Campos" value={String(fields.length)} />
      </Section>
      <Section title="REGLAS DE VALIDACIÓN">
        {fields.length === 0 ? (
          <p className="text-[var(--color-fg-3)]">Este esquema no tiene campos definidos.</p>
        ) : (
          <div className="overflow-hidden rounded-[3px] border border-[var(--color-border-subtle)]">
            {fields.map(([name, field]) => (
              <div key={name} className="border-b border-[var(--color-border-subtle)] p-3 last:border-b-0">
                <p className="font-bold text-[var(--color-fg-0)]">{name}</p>
                <div className="mt-2 grid gap-x-4 gap-y-1 text-[11px] sm:grid-cols-2">
                  <FieldDetail label="Tipo" value={field.type} />
                  <FieldDetail label="Obligatorio" value={field.required ? "Sí" : "No"} />
                  <FieldDetail label="Predeterminado" value={formatDefault(field.default)} />
                  <FieldDetail label="Rango" value={formatRange(field)} />
                  {field.operation && <FieldDetail label="Fórmula" value={formatFormula(field)} full />}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="t-label mb-2">{"// "}{title}</p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 items-baseline">
      <span className="uppercase text-[var(--color-fg-3)]">{label}</span>
      <span className="break-all text-[var(--color-fg-1)]">{value}</span>
    </div>
  );
}

function FieldDetail({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <span className="text-[var(--color-fg-3)]">{label}: </span>
      <span className="break-all text-[var(--color-fg-1)]">{value}</span>
    </div>
  );
}

function sourceTypeLabel(type: DataSource["sourceType"]): string {
  return type === "RABBIT_MQ" ? "RabbitMQ" : type;
}

function storeTypeLabel(type: DataStore["storeType"]): string {
  if (type === "INFLUX_DB") return "InfluxDB";
  if (type === "LOCAL_LOG") return "Registro local";
  return "Webhook";
}

function formatDefault(value: FieldSchema["default"]): string {
  return value === null || value === undefined ? "—" : String(value);
}

function formatRange(field: FieldSchema): string {
  const range = field.validation;
  if (!range || (range.min === undefined && range.max === undefined)) return "—";
  return `[${range.min ?? "−∞"} … ${range.max ?? "+∞"}]`;
}

function formatFormula(field: FieldSchema): string {
  if (!field.operation) return "—";
  const expression = fromBackend(field.operation);
  return expression ? printFormula(expression) : "—";
}

function redactUrl(url: string | undefined): string {
  if (!url) return "—";
  const schemeEnd = url.indexOf("://");
  const credentialsEnd = schemeEnd >= 0 ? url.indexOf("@", schemeEnd + 3) : -1;
  const withoutCredentials = credentialsEnd >= 0
    ? `${url.slice(0, schemeEnd + 3)}•••@${url.slice(credentialsEnd + 1)}`
    : url;
  const queryStart = withoutCredentials.indexOf("?");
  return queryStart >= 0 ? `${withoutCredentials.slice(0, queryStart)}?…` : withoutCredentials;
}
