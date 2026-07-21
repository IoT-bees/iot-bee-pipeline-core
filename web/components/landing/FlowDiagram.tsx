"use client";

import { useEffect, useState, type ReactNode } from "react";

type FlowPhase = "idle" | "incoming" | "processing" | "delivery" | "received";

function MobileFlowStep({
  title,
  detail,
  glyph,
  accent = false,
}: {
  title: string;
  detail: string;
  glyph: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`flex items-center gap-5 border bg-[var(--color-bg-panel)] px-5 py-5 ${accent ? "border-[var(--color-accent)]" : "border-[var(--landing-border)]"}`}>
      <div className="flex h-14 w-14 shrink-0 items-center justify-center">{glyph}</div>
      <div>
        <h3 className="text-[16px] font-semibold text-[var(--color-fg-0)]">{title}</h3>
        <p className="mt-1 text-[12px] text-[var(--color-fg-3)]">{detail}</p>
      </div>
    </div>
  );
}

function MobileArrow() {
  return <div className="my-2 text-center text-[22px] text-[var(--color-accent)]">↓</div>;
}

const brokerGlyph = (
  <svg viewBox="-28 -20 56 40" className="h-11 w-12" aria-hidden="true">
    <rect x="-23" y="-15" width="46" height="8" rx="1" fill="var(--color-accent)" />
    <rect x="-23" y="-3" width="46" height="8" rx="1" fill="var(--color-accent)" opacity="0.68" />
    <rect x="-23" y="9" width="46" height="8" rx="1" fill="var(--color-accent)" opacity="0.38" />
  </svg>
);

const processingGlyph = (
  <svg viewBox="0 0 56 56" className="h-12 w-12" aria-hidden="true">
    <polygon points="28,2 51,15 51,41 28,54 5,41 5,15" fill="var(--color-accent)" />
    <text x="28" y="33" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="14" fontWeight="800" fill="var(--landing-accent-ink)">b</text>
  </svg>
);

const destinationGlyph = (
  <svg viewBox="-30 -18 60 60" className="h-12 w-12" aria-hidden="true">
    <ellipse cx="0" cy="-5" rx="24" ry="6" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
    <path d="M -24 -5 L -24 26 A 24 6 0 0 0 24 26 L 24 -5" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
    <ellipse cx="0" cy="8" rx="24" ry="6" fill="none" stroke="var(--color-accent)" strokeWidth="1" opacity="0.5" />
  </svg>
);

function SideNode({ side }: { side: "input" | "output" }) {
  const isInput = side === "input";

  return (
    <g className={isInput ? "flow-source-node" : "flow-destination-node"} transform={`translate(${isInput ? 30 : 775},52)`}>
      <rect width="275" height="126" rx="8" fill="var(--color-bg-panel)" stroke="var(--landing-border)" strokeWidth="1.5" />
      <text x="24" y="32" fill="var(--color-accent-strong)" fontSize="11" fontWeight="700" fontFamily="ui-monospace, monospace">{isInput ? "ENTRADA" : "SALIDA"}</text>
      <text x="24" y="72" fill="var(--color-fg-0)" fontSize="16" fontWeight="700" fontFamily="-apple-system, system-ui, sans-serif">{isInput ? "Broker" : "Destino"}</text>
      <text x="24" y="96" fill="var(--color-fg-3)" fontSize="12" fontFamily="-apple-system, system-ui, sans-serif">{isInput ? "MQTT, RabbitMQ o Kafka" : "Webhook o InfluxDB"}</text>
    </g>
  );
}

function LiveFlowGraphic({ phase }: { phase: FlowPhase }) {
  return (
    <svg viewBox="0 0 1080 230" className={`h-auto w-full flow-${phase}`} aria-label="Un evento se transmite del broker a iot bees para su procesamiento y luego al destino del cliente">
      <SideNode side="input" />
      <path d="M 305 115 H 463" stroke="var(--color-accent)" strokeWidth="2" strokeDasharray="4 7" className="flow-connection" />

      <g transform="translate(432,25)" className="flow-core">
        <polygon points="108,0 185,45 185,135 108,180 31,135 31,45" fill="var(--color-accent)" stroke="none" />
        <polygon points="108,1 184,45 184,135 108,179 32,135 32,45" fill="none" stroke="var(--landing-accent-ink)" strokeWidth="2" strokeLinejoin="round" pathLength="100" className="flow-panel-border" />
        <text x="108" y="79" textAnchor="middle" fill="var(--landing-accent-ink)" fontSize="10" fontWeight="700" fontFamily="ui-monospace, monospace">PROCESAMIENTO</text>
        <text x="108" y="108" textAnchor="middle" fill="var(--landing-accent-ink)" fontSize="16" fontWeight="700" fontFamily="ui-monospace, monospace">iot bees</text>
      </g>

      <SideNode side="output" />
      <path d="M 617 115 H 775" stroke="var(--color-accent)" strokeWidth="2" strokeDasharray="4 7" className="flow-connection" />

      <circle cx="305" cy="115" r="6" fill="var(--color-accent)" className="flow-input-packet" aria-hidden="true" />
      <circle cx="617" cy="115" r="6" fill="var(--color-online)" className="flow-output-packet" aria-hidden="true" />
    </svg>
  );
}

export function FlowDiagram() {
  const [phase, setPhase] = useState<FlowPhase>("idle");

  useEffect(() => {
    const timing: Record<FlowPhase, number> = {
      idle: 700,
      incoming: 1800,
      processing: 1800,
      delivery: 1700,
      received: 1100,
    };
    const next: Record<FlowPhase, FlowPhase> = {
      idle: "incoming",
      incoming: "processing",
      processing: "delivery",
      delivery: "received",
      received: "idle",
    };
    const timeout = window.setTimeout(() => setPhase(next[phase]), timing[phase]);

    return () => window.clearTimeout(timeout);
  }, [phase]);

  return (
    <section id="flujo" className="flow-diagram border-t border-[var(--landing-border)] bg-[var(--landing-section-bg)] px-4 py-16 sm:px-6 lg:px-12">
      <div className="mx-auto max-w-[1080px]">
        <div className="mb-2 text-[12px] font-semibold text-[var(--color-accent-strong)]">UN FLUJO CLARO</div>
        <h2 className="text-[28px] font-bold leading-tight text-[var(--color-fg-0)] sm:text-[36px]">Del equipo instalado al sistema del cliente.</h2>
        <p className="mt-3 max-w-[620px] text-[15px] leading-[1.6] text-[var(--color-fg-3)]">
          Cada proyecto reúne una conexión, una definición de datos y una entrega confiable.
        </p>

        <div className="mt-9 md:hidden">
          <MobileFlowStep title="Broker" detail="MQTT, RabbitMQ o Kafka" glyph={brokerGlyph} />
          <MobileArrow />
          <MobileFlowStep title="Procesamiento" detail="iot bees" glyph={processingGlyph} accent />
          <MobileArrow />
          <MobileFlowStep title="Destino" detail="Webhook o InfluxDB" glyph={destinationGlyph} />
        </div>
        <div className="mt-9 hidden md:block"><LiveFlowGraphic phase={phase} /></div>
      </div>

      <style jsx global>{`
        .flow-diagram .flow-input-packet, .flow-diagram .flow-output-packet { opacity: 0; transition: opacity 220ms ease, transform 1.7s cubic-bezier(.22, .61, .36, 1); transform-box: fill-box; transform-origin: center; }
        .flow-diagram .flow-input-packet { transform: translateX(-18px); }
        .flow-diagram .flow-output-packet { transform: translateX(0); }
        .flow-diagram .flow-core { transition: opacity 500ms ease; }
        .flow-diagram .flow-panel-border { stroke-dasharray: 100; stroke-dashoffset: 100; transition: stroke-dashoffset 1.8s linear; }
        .flow-diagram .flow-source-node > rect, .flow-diagram .flow-destination-node > rect { transition: filter 400ms ease, stroke 400ms ease; }
        .flow-diagram .flow-connection { opacity: .62; transition: opacity 400ms ease; }
        .flow-diagram .flow-incoming .flow-input-packet { opacity: 1; transform: translateX(158px); }
        .flow-diagram .flow-incoming .flow-source-node > rect { stroke: var(--color-accent); filter: drop-shadow(0 0 5px rgb(255 179 0 / 25%)); }
        .flow-diagram .flow-processing .flow-panel-border { stroke-dashoffset: 0; }
        .flow-diagram .flow-idle .flow-panel-border, .flow-diagram .flow-delivery .flow-panel-border, .flow-diagram .flow-received .flow-panel-border { transition: none; stroke-dashoffset: 100; }
        .flow-diagram .flow-delivery .flow-output-packet { opacity: 1; transform: translateX(158px); }
        .flow-diagram .flow-received .flow-destination-node > rect { stroke: var(--color-online); filter: drop-shadow(0 0 6px rgb(21 115 71 / 25%)); }
      `}</style>
    </section>
  );
}
