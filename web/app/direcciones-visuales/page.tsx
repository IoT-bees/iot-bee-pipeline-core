"use client";

import Link from "next/link";
import { ArrowLeft, Check, CircleDot, Database, Radio, ShieldCheck } from "lucide-react";
import { useState } from "react";

type Direction = {
  id: "industrial" | "operaciones" | "tecnico";
  label: string;
  title: string;
  description: string;
  background: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
  border: string;
};

const brandAmber = "#FFB300";
const brandAmberInk = "#1A1600";

const directions: Direction[] = [
  {
    id: "industrial",
    label: "A. Industrial claro",
    title: "Calma operativa",
    description: "Claro, preciso y confiable. Mi recomendación para vender a empresas.",
    background: "#F4F7F6",
    surface: "#FFFFFF",
    ink: "#17302B",
    muted: "#61716C",
    accent: brandAmber,
    accentInk: brandAmberInk,
    border: "#D7E0DD",
  },
  {
    id: "operaciones",
    label: "B. Operaciones sobrias",
    title: "Control y escala",
    description: "Base azul profundo y ámbar de marca. Más corporativo para proyectos industriales.",
    background: "#F6F8FC",
    surface: "#FFFFFF",
    ink: "#18243D",
    muted: "#68758A",
    accent: brandAmber,
    accentInk: brandAmberInk,
    border: "#D9E0EC",
  },
  {
    id: "tecnico",
    label: "C. Técnico humano",
    title: "Experto, sin frialdad",
    description: "Grafito y ámbar de marca. Conserva energía sin parecer una consola.",
    background: "#F7F7F5",
    surface: "#FFFFFF",
    ink: "#262A33",
    muted: "#6A707B",
    accent: brandAmber,
    accentInk: brandAmberInk,
    border: "#DFE1E5",
  },
];

export default function VisualDirectionsPage() {
  const [selected, setSelected] = useState<Direction["id"] | null>(null);

  return (
    <main className="min-h-screen bg-[#EFF2F3] px-4 py-6 sm:px-8 lg:px-12">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center gap-2 text-[13px] text-[#52605D] hover:text-[#17302B]">
          <ArrowLeft size={16} /> Volver a la landing
        </Link>
        <span className="text-[12px] font-semibold tracking-[1.5px] text-[#52605D]">REVISIÓN VISUAL</span>
      </header>

      <section className="mx-auto max-w-[1240px] py-12 sm:py-16">
        <p className="text-[12px] font-semibold tracking-[1.5px]" style={{ color: brandAmber }}>TRES DIRECCIONES</p>
        <h1 className="mt-3 max-w-[720px] text-[34px] font-semibold leading-tight text-[#17302B] sm:text-[48px]">
          Mismo producto. Tres formas de transmitir confianza.
        </h1>
        <p className="mt-4 max-w-[680px] text-[16px] leading-7 text-[#52605D]">
          Ninguna usa neón, textura de terminal ni una estética de consola. Elige la que mejor represente cómo quieres que un cliente empresarial perciba iot bees.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {directions.map((direction) => {
            const isSelected = selected === direction.id;

            return (
              <article
                key={direction.id}
                className="overflow-hidden border bg-white shadow-[0_1px_2px_rgba(20,35,31,0.08)]"
                style={{ borderColor: isSelected ? direction.accent : "#D9E0DE", borderWidth: isSelected ? 2 : 1 }}
              >
                <div className="p-5" style={{ background: direction.background, color: direction.ink }}>
                  <p className="text-[12px] font-bold tracking-[1.2px]" style={{ color: direction.accent }}>{direction.label}</p>
                  <h2 className="mt-2 text-[24px] font-semibold">{direction.title}</h2>
                  <p className="mt-2 min-h-[72px] text-[14px] leading-6" style={{ color: direction.muted }}>{direction.description}</p>

                  <div className="mt-6 border p-4" style={{ background: direction.surface, borderColor: direction.border }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold tracking-[1px]" style={{ color: direction.muted }}>CADENA DE FRÍO</p>
                        <p className="mt-1 text-[17px] font-semibold">Proyecto Andina</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: direction.accent }}>
                        <CircleDot size={14} /> Activo
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      {[
                        { label: "Broker", Icon: Radio },
                        { label: "Payload", Icon: ShieldCheck },
                        { label: "Destino", Icon: Database },
                      ].map(({ label, Icon }) => (
                        <div key={label} className="border p-2" style={{ borderColor: direction.border }}>
                          <Icon size={16} style={{ color: direction.accent }} />
                          <p className="mt-3 text-[11px] font-semibold">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <span className="inline-block h-4 w-4 border" style={{ background: direction.background, borderColor: direction.border }} />
                    <span className="ml-2 inline-block h-4 w-4" style={{ background: direction.ink }} />
                    <span className="ml-2 inline-block h-4 w-4" style={{ background: direction.accent }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(direction.id)}
                    className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-semibold transition-colors"
                    style={{ background: isSelected ? direction.accent : direction.background, color: isSelected ? direction.accentInk : direction.ink }}
                  >
                    {isSelected && <Check size={15} />}
                    {isSelected ? "Seleccionada" : "Elegir"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-8 text-[14px] text-[#52605D]">
          {selected
            ? `Elegiste ${directions.find((direction) => direction.id === selected)?.label}. Dime cuál fue y aplico esa dirección a la landing.`
            : "Selecciona una dirección para compararla con las demás."}
        </p>
      </section>
    </main>
  );
}
