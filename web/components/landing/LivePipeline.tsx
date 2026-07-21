"use client";

import { useEffect, useState } from "react";
import { Activity, Database, Radio, ShieldCheck } from "lucide-react";

type Scenario = {
  name: string;
  detail: string;
  metric: string;
  rows: Array<{
    device: string;
    reading: string;
    time: string;
    status: "normal" | "attention";
  }>;
  activity: Array<{
    actor: string;
    role: string;
    message: string;
    time: string;
  }>;
};

const scenarios: Scenario[] = [
  {
    name: "Cadena de frío",
    detail: "Centro logístico · Medellín",
    metric: "142 msg/min",
    rows: [
      { device: "cuarto-frio-01", reading: "3.8 °C", time: "ahora", status: "normal" },
      { device: "cuarto-frio-02", reading: "4.1 °C", time: "ahora", status: "normal" },
      { device: "camion-07", reading: "8.6 °C", time: "hace 4 s", status: "attention" },
      { device: "bodega-norte", reading: "3.6 °C", time: "hace 6 s", status: "normal" },
    ],
    activity: [
      { actor: "iot bees", role: "validó", message: "payload de camion-07", time: "ahora" },
      { actor: "Regla térmica", role: "detectó", message: "temperatura fuera de rango", time: "ahora" },
      { actor: "Webhook cliente", role: "recibió", message: "alerta de operación", time: "hace 1 s" },
    ],
  },
  {
    name: "Energía",
    detail: "Edificio corporativo · Bogotá",
    metric: "86 msg/min",
    rows: [
      { device: "medidor-piso-01", reading: "12.4 kW", time: "ahora", status: "normal" },
      { device: "medidor-piso-02", reading: "11.8 kW", time: "ahora", status: "normal" },
      { device: "tablero-principal", reading: "41.2 kW", time: "hace 2 s", status: "attention" },
      { device: "planta-emergencia", reading: "0.0 kW", time: "hace 5 s", status: "normal" },
    ],
    activity: [
      { actor: "iot bees", role: "normalizó", message: "lectura de tablero-principal", time: "ahora" },
      { actor: "Regla de consumo", role: "marcó", message: "pico sobre umbral", time: "ahora" },
      { actor: "InfluxDB", role: "guardó", message: "métrica procesada", time: "hace 1 s" },
    ],
  },
  {
    name: "Riego",
    detail: "Cultivo de flores · Rionegro",
    metric: "64 msg/min",
    rows: [
      { device: "sector-a-01", reading: "42% humedad", time: "ahora", status: "normal" },
      { device: "sector-a-02", reading: "39% humedad", time: "ahora", status: "normal" },
      { device: "sector-c-04", reading: "21% humedad", time: "hace 3 s", status: "attention" },
      { device: "tanque-principal", reading: "78% nivel", time: "hace 6 s", status: "normal" },
    ],
    activity: [
      { actor: "iot bees", role: "aceptó", message: "telemetría de sector-c-04", time: "ahora" },
      { actor: "Regla de riego", role: "abrió", message: "válvula del sector C", time: "ahora" },
      { actor: "API finca", role: "confirmó", message: "acción entregada", time: "hace 2 s" },
    ],
  },
];

const icons = [Radio, Activity, Database];

export function LivePipeline() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scenario = scenarios[activeIndex];

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % scenarios.length);
    }, 7000);

    return () => window.clearTimeout(timeout);
  }, [activeIndex]);

  return (
    <section className="border-t border-[var(--landing-border)] bg-[var(--landing-section-bg)] px-4 py-16 sm:px-6 lg:px-12">
      <div className="mx-auto grid max-w-[1080px] gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
        <div>
          <p className="text-[12px] font-semibold text-[var(--color-accent-strong)]">OPERACIÓN · EN VIVO</p>
          <h2 className="mt-2 text-[28px] font-bold leading-tight text-[var(--color-fg-0)] sm:text-[38px]">
            Ve cada dato llegar, validarse y entregarse.
          </h2>
          <p className="mt-4 max-w-[500px] text-[15px] leading-[1.65] text-[var(--color-fg-3)]">
            Una vista operativa para saber qué ocurre en cada instalación sin perseguir logs, hojas de cálculo o mensajes del cliente.
          </p>

          <div className="mt-7 space-y-3 text-[14px] text-[var(--color-fg-2)]">
            <div className="flex items-center gap-3"><Radio size={17} className="text-[var(--color-accent-strong)]" aria-hidden="true" /> Datos desde el broker del cliente.</div>
            <div className="flex items-center gap-3"><ShieldCheck size={17} className="text-[var(--color-accent-strong)]" aria-hidden="true" /> Reglas que explican cada alerta.</div>
            <div className="flex items-center gap-3"><Database size={17} className="text-[var(--color-accent-strong)]" aria-hidden="true" /> Entrega confirmada en el destino final.</div>
          </div>
        </div>

        <div className="overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-panel)] shadow-[0_18px_50px_rgb(38_42_51_/_10%)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-3 text-[12px]">
            <span className="font-semibold text-[var(--color-fg-0)]">Proyecto activo</span>
            <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-3)]">
              <span className="live-dot h-2 w-2 rounded-full bg-[var(--color-online)]" /> iot bees · en vivo
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-[var(--color-border-subtle)] px-3 py-3">
            {scenarios.map((item, index) => (
              <button
                key={item.name}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                  activeIndex === index
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--landing-accent-ink)]"
                    : "border-[var(--color-border)] text-[var(--color-fg-3)] hover:border-[var(--color-accent)]"
                }`}
                aria-pressed={activeIndex === index}
              >
                {item.name}
              </button>
            ))}
          </div>

          <div key={scenario.name} className="live-content grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_180px]">
            <div className="min-w-0">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--color-fg-0)]">{scenario.name}</h3>
                  <p className="mt-0.5 text-[11px] text-[var(--color-fg-3)]">{scenario.detail}</p>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-[var(--color-accent-strong)]">{scenario.metric}</span>
              </div>

              <div className="overflow-hidden border border-[var(--color-border-subtle)]">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-elev)] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-fg-3)]">
                  <span>dispositivo</span><span>lectura</span><span>recibido</span>
                </div>
                {scenario.rows.map((row, index) => (
                  <div
                    key={row.device}
                    className={`live-row grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-b border-[var(--color-border-subtle)] px-3 py-2.5 text-[11px] last:border-b-0 ${row.status === "attention" ? "bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]" : ""}`}
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <span className="truncate font-mono text-[var(--color-fg-1)]">{row.device}</span>
                    <span className={row.status === "attention" ? "font-semibold text-[var(--color-danger)]" : "text-[var(--color-fg-1)]"}>{row.reading}</span>
                    <span className="text-[var(--color-fg-4)]">{row.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <aside className="border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-3">
              <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-fg-3)]">actividad</p>
              <div className="space-y-3">
                {scenario.activity.map((event, index) => {
                  const Icon = icons[index];
                  return (
                    <div key={`${event.actor}-${event.message}`} className="live-event flex gap-2" style={{ animationDelay: `${240 + index * 120}ms` }}>
                      <Icon size={14} className="mt-0.5 shrink-0 text-[var(--color-accent-strong)]" aria-hidden="true" />
                      <p className="text-[10px] leading-[1.45] text-[var(--color-fg-3)]">
                        <span className="font-semibold text-[var(--color-fg-1)]">{event.actor}</span> {event.role} {event.message}
                        <span className="block pt-0.5 text-[var(--color-fg-4)]">{event.time}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        </div>
      </div>

      <style jsx>{`
        .live-dot { animation: live-pulse 1.8s ease-in-out infinite; }
        .live-content { animation: live-enter 420ms ease-out both; }
        .live-row, .live-event { animation: live-row-in 340ms ease-out both; }
        @keyframes live-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgb(21 115 71 / 0%); }
          50% { box-shadow: 0 0 0 5px rgb(21 115 71 / 18%); }
        }
        @keyframes live-enter {
          from { opacity: 0; transform: translateY(7px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes live-row-in {
          from { opacity: 0; transform: translateX(-5px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .live-dot, .live-content, .live-row, .live-event { animation: none; }
        }
      `}</style>
    </section>
  );
}
