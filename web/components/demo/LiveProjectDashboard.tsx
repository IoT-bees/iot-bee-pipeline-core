"use client";

import { useEffect, useState } from "react";
import { Check, Database, LoaderCircle, Radio, ShieldCheck, TriangleAlert } from "lucide-react";

type Reading = {
  device: string;
  temperature: string;
  humidity: string;
  received: string;
  state: "ok" | "alert";
  activity: string;
};

const readings: Reading[] = [
  {
    device: "camara-fria-03",
    temperature: "4.2 °C",
    humidity: "67 %",
    received: "ahora",
    state: "ok",
    activity: "Telemetría validada y entregada al webhook.",
  },
  {
    device: "camion-12",
    temperature: "7.8 °C",
    humidity: "64 %",
    received: "hace 3 s",
    state: "alert",
    activity: "Temperatura fuera de rango: se notificó al cliente.",
  },
  {
    device: "bodega-norte",
    temperature: "3.9 °C",
    humidity: "70 %",
    received: "hace 7 s",
    state: "ok",
    activity: "Payload normalizado y archivado correctamente.",
  },
  {
    device: "camara-fria-01",
    temperature: "4.0 °C",
    humidity: "66 %",
    received: "hace 11 s",
    state: "ok",
    activity: "Entrega confirmada por el destino del cliente.",
  },
];

const phases = [
  {
    brokerDetail: "Recibiendo evento MQTT",
    validationDetail: "En espera",
    destinationDetail: "En espera",
    activeStage: 0,
    activeConnector: -1,
    packetText: "nuevo evento entrando al broker",
  },
  {
    brokerDetail: "Mensaje recibido",
    validationDetail: "Aplicando 3 reglas",
    destinationDetail: "En espera",
    activeStage: 1,
    activeConnector: 0,
    packetText: "payload pasando a validación",
  },
  {
    brokerDetail: "Mensaje validado",
    validationDetail: "Campos y rangos válidos",
    destinationDetail: "Enviando al webhook",
    activeStage: 2,
    activeConnector: 1,
    packetText: "entrega hacia el sistema del cliente",
  },
  {
    brokerDetail: "Conectado",
    validationDetail: "3 reglas activas",
    destinationDetail: "200 OK · entrega confirmada",
    activeStage: 2,
    activeConnector: -1,
    packetText: "evento entregado correctamente",
  },
];

function Status({ children, alert = false }: { children: React.ReactNode; alert?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${alert ? "text-[var(--color-danger)]" : "text-[var(--color-online)]"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${alert ? "bg-[var(--color-danger)]" : "bg-[var(--color-online)]"}`} />
      {children}
    </span>
  );
}

export function LiveProjectDashboard() {
  const [readingIndex, setReadingIndex] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const activeReading = readings[readingIndex];
  const phase = phases[phaseIndex];

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPhaseIndex((current) => {
        const next = (current + 1) % phases.length;
        if (next === 0) setReadingIndex((reading) => (reading + 1) % readings.length);
        return next;
      });
    }, 3400);

    return () => window.clearTimeout(timeout);
  }, [phaseIndex]);

  return (
    <section className="mt-10 overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-panel)] shadow-[0_18px_50px_rgb(38_42_51_/_10%)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3 sm:px-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-fg-4)]">Cadena de frío · Cliente Andina</p>
          <p className="mt-0.5 text-[15px] font-semibold text-[var(--color-fg-0)]">Proyecto activo</p>
        </div>
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-accent-strong)]">
          <span className="project-live-dot h-2 w-2 rounded-full bg-[var(--color-online)]" /> operación en vivo
        </span>
      </header>

      <div className="grid gap-px border-b border-[var(--color-border-subtle)] bg-[var(--color-border-subtle)] sm:grid-cols-3">
        <div className="bg-[var(--color-bg-panel)] px-4 py-3 sm:px-5">
          <p className="text-[10px] uppercase text-[var(--color-fg-4)]">Estado</p>
          <p className="mt-1 text-[15px] font-semibold text-[var(--color-online)]">Activo</p>
        </div>
        <div className="bg-[var(--color-bg-panel)] px-4 py-3 sm:px-5">
          <p className="text-[10px] uppercase text-[var(--color-fg-4)]">Eventos hoy</p>
          <p className="mt-1 text-[15px] font-semibold text-[var(--color-fg-0)]">2.480 <span className="text-[11px] font-normal text-[var(--color-fg-4)]">procesados</span></p>
        </div>
        <div className="bg-[var(--color-bg-panel)] px-4 py-3 sm:px-5">
          <p className="text-[10px] uppercase text-[var(--color-fg-4)]">Última entrega</p>
          <p className="mt-1 text-[15px] font-semibold text-[var(--color-fg-0)]">Confirmada <span className="text-[11px] font-normal text-[var(--color-fg-4)]">ahora</span></p>
        </div>
      </div>

      <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-4 py-3 sm:px-5">
        <div className="incoming-stream mb-2 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--color-fg-4)]">
          <span className="shrink-0">clients/andina/cold-chain</span>
          <span className="incoming-line relative h-px flex-1 bg-[var(--color-border)]"><span className="incoming-packet absolute -top-1.5 h-3 w-3 rounded-full bg-[var(--color-accent)]" /></span>
          <span className="shrink-0 text-[var(--color-accent-strong)]">MQTT</span>
        </div>
        <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <PipelineStep icon={Radio} label="Broker" value="MQTT · planta norte" detail={phase.brokerDetail} state={phase.activeStage === 0 ? "active" : "complete"} />
          <PipelineArrow active={phase.activeConnector === 0} />
          <PipelineStep icon={ShieldCheck} label="Validación" value="Temperatura y humedad" detail={phase.validationDetail} state={phase.activeStage === 1 ? "active" : phase.activeStage > 1 ? "complete" : "idle"} />
          <PipelineArrow active={phase.activeConnector === 1} />
          <PipelineStep icon={Database} label="Destino" value="Webhook del cliente" detail={phase.destinationDetail} state={phase.activeStage === 2 ? "active" : "idle"} />
        </div>

        <div key={`${activeReading.device}-${phaseIndex}`} className="packet mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] px-3 py-2 text-[11px]">
          <span className="font-mono font-semibold text-[var(--color-fg-0)]">{activeReading.device}</span>
          <span className="text-[var(--color-fg-2)]">{activeReading.temperature}</span>
          <span className="text-[var(--color-fg-2)]">{activeReading.humidity}</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[var(--color-accent-strong)]"><span className="packet-dot h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" /> {phase.packetText}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-[13px] font-semibold text-[var(--color-fg-0)]">Telemetría recibida</h2>
            <span className="font-mono text-[10px] text-[var(--color-fg-4)]">stream / planta-norte</span>
          </div>
          <div className="overflow-x-auto border border-[var(--color-border-subtle)]">
            <div className="min-w-[500px]">
              <div className="grid grid-cols-[minmax(150px,1fr)_110px_100px_110px] gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-elev)] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-fg-4)]">
                <span>dispositivo</span><span>temperatura</span><span>humedad</span><span>estado</span>
              </div>
              {readings.map((reading, index) => (
                <div key={reading.device} className={`grid grid-cols-[minmax(150px,1fr)_110px_100px_110px] gap-3 border-b border-[var(--color-border-subtle)] px-3 py-1.5 text-[11px] last:border-b-0 ${index === readingIndex ? "reading-active" : ""}`}>
                  <span className="font-mono text-[var(--color-fg-1)]">{reading.device}</span>
                  <span className={reading.state === "alert" ? "font-semibold text-[var(--color-danger)]" : "text-[var(--color-fg-1)]"}>{reading.temperature}</span>
                  <span className="text-[var(--color-fg-2)]">{reading.humidity}</span>
                  <Status alert={reading.state === "alert"}>{reading.state === "alert" ? "Atención" : "Entregado"}</Status>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-4 sm:p-5 md:border-l md:border-t-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-fg-4)]">actividad reciente</p>
          <div key={activeReading.device} className="activity-update mt-2 flex gap-3">
            {activeReading.state === "alert" ? <TriangleAlert size={16} className="mt-0.5 shrink-0 text-[var(--color-danger)]" aria-hidden="true" /> : <Check size={16} className="mt-0.5 shrink-0 text-[var(--color-online)]" aria-hidden="true" />}
            <div>
              <p className="text-[12px] font-semibold text-[var(--color-fg-0)]">{activeReading.device}</p>
              <p className="mt-1 text-[11px] leading-[1.4] text-[var(--color-fg-3)]">{activeReading.activity}</p>
              <p className="mt-1 text-[10px] text-[var(--color-fg-4)]">{activeReading.received}</p>
            </div>
          </div>
          <div className="mt-3 border-t border-[var(--color-border-subtle)] pt-2 text-[11px] leading-[1.4] text-[var(--color-fg-3)]">
            Cada lectura queda disponible para el cliente con su validación y resultado de entrega.
          </div>
        </aside>
      </div>

      <style jsx>{`
        .project-live-dot { animation: project-pulse 1.8s ease-in-out infinite; }
        .packet, .activity-update { animation: packet-in 360ms ease-out both; }
        .packet-dot { animation: packet-blink 2.2s ease-in-out infinite; }
        .incoming-packet { animation: incoming-packet 3.4s linear infinite; }
        .pipeline-arrow-active { animation: connector-glow 3.4s ease-in-out infinite; }
        .pipeline-arrow-packet { animation: transfer-packet 2.6s ease-in-out infinite; }
        .reading-active { background: color-mix(in srgb, var(--color-accent) 12%, transparent); animation: row-focus 900ms ease-out both; }
        @keyframes project-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgb(21 115 71 / 0%); }
          50% { box-shadow: 0 0 0 5px rgb(21 115 71 / 18%); }
        }
        @keyframes packet-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes packet-blink { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
        @keyframes incoming-packet { from { left: 0; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } to { left: calc(100% - 12px); opacity: 0; } }
        @keyframes connector-glow { 0%, 100% { color: var(--color-accent); opacity: .45; } 50% { color: var(--color-accent-strong); opacity: 1; } }
        @keyframes transfer-packet { from { left: 0; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } to { left: calc(100% - 7px); opacity: 0; } }
        @keyframes row-focus { from { background: color-mix(in srgb, var(--color-accent) 30%, transparent); } to { background: color-mix(in srgb, var(--color-accent) 12%, transparent); } }
        @media (prefers-reduced-motion: reduce) {
          .project-live-dot, .packet, .activity-update, .packet-dot, .incoming-packet, .pipeline-arrow-active, .pipeline-arrow-packet, .reading-active { animation: none; }
        }
      `}</style>
    </section>
  );
}

function PipelineStep({
  icon: Icon,
  label,
  value,
  detail,
  state,
}: {
  icon: typeof Radio;
  label: string;
  value: string;
  detail: string;
  state: "idle" | "active" | "complete";
}) {
  const isActive = state === "active";
  const isComplete = state === "complete";

  return (
    <div className={`border p-2 ${isActive ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-bg-panel))]" : "border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)]"}`}>
      <div className="flex items-center gap-2 text-[var(--color-accent-strong)]">
        {isActive ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Icon size={15} aria-hidden="true" />}
        <span className="font-mono text-[9px] uppercase tracking-[0.1em]">{label}</span>
      </div>
      <p className="mt-1 text-[12px] font-semibold text-[var(--color-fg-0)]">{value}</p>
      <p className={`text-[10px] ${isActive ? "text-[var(--color-accent-strong)]" : isComplete ? "text-[var(--color-online)]" : "text-[var(--color-fg-4)]"}`}>{detail}</p>
    </div>
  );
}

function PipelineArrow({ active }: { active: boolean }) {
  return (
    <div className={`relative hidden h-5 sm:block ${active ? "pipeline-arrow-active" : "text-[var(--color-border-strong)]"}`} aria-hidden="true">
      <span className="absolute left-0 right-0 top-1/2 border-t border-current" />
      {active && <span className="pipeline-arrow-packet absolute top-[7px] h-1.5 w-1.5 rounded-full bg-current" />}
    </div>
  );
}
