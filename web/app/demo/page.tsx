import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { LiveProjectDashboard } from "@/components/demo/LiveProjectDashboard";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { getPublicContactSettings } from "@/lib/api/contactServer";

export const metadata: Metadata = {
  title: "Ejemplo de proyecto",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DemoPage() {
  const contact = await getPublicContactSettings();
  return (
    <>
      <main className="min-h-screen bg-[var(--color-bg-base)]">
        <MarketingNav />

        <section className="px-4 pb-16 pt-14 sm:px-6 lg:px-12 lg:pb-20 lg:pt-20">
          <div className="mx-auto max-w-[1080px]">
            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-[var(--color-accent-strong)]">Ejemplo de proyecto</p>
              <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-bold text-[var(--color-fg-2)] transition-colors hover:text-[var(--color-accent)]">
                <ArrowLeft size={16} aria-hidden="true" />
                Volver
              </Link>
            </div>
            <div className="max-w-[850px]">
              <h1 className="mt-3 text-[42px] font-bold leading-[1.08] text-[var(--color-fg-0)] sm:text-[56px]">
                Un proyecto que se puede operar de verdad.
              </h1>
              <p className="mt-5 max-w-[650px] text-[18px] leading-[1.55] text-[var(--color-fg-1)]">
                Telemetría que entra, se valida y llega al sistema del cliente. Datos de ejemplo.
              </p>
            </div>

            <LiveProjectDashboard />
          </div>
        </section>
      </main>
      <LandingFooter contact={contact} />
    </>
  );
}
