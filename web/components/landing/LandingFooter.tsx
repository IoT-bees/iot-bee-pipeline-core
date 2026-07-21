"use client";

import Link from "next/link";
import { Mail, MessageCircle, Moon, Sun } from "lucide-react";
import { BrandMark } from "@/components/Logo";
import { useAppTheme } from "@/components/landing/LandingThemeProvider";
import type { ContactSettings } from "@/lib/api/types";

export function LandingFooter({ contact }: { contact: ContactSettings }) {
  const { theme, setTheme } = useAppTheme();
  const whatsappUrl = contact.whatsappNumber
    ? `https://wa.me/${contact.whatsappNumber}`
    : null;

  return (
    <footer className="border-t border-[var(--landing-border)] bg-[var(--color-bg-0)] font-mono">
      <div className="mx-auto max-w-[1120px] px-4 py-10 sm:px-6 lg:px-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/" className="inline-flex transition-opacity hover:opacity-80">
              <BrandMark size={26} />
            </Link>
            <p className="mt-4 max-w-sm text-[14px] leading-6 text-[var(--color-fg-2)]">
              Operación IoT para integradores.
            </p>
            <p className="mt-1 text-[12px] text-[var(--color-fg-3)]">
              Infraestructura confiable, desde el dispositivo hasta tus datos.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap items-end gap-3 sm:justify-end">
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-fg-3)]">
                  ¿Hablamos?
                </span>
                <a
                  href={`mailto:${contact.contactEmail}`}
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[2px] bg-[var(--color-accent)] px-4 text-[13px] font-bold text-[var(--landing-accent-ink)] transition-colors hover:bg-[var(--color-accent-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                  aria-label={`Contactar a ${contact.contactEmail}`}
                >
                  <Mail size={15} aria-hidden="true" />
                  Contacto
                </a>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[2px] border border-[var(--color-border-strong)] px-4 text-[13px] font-bold text-[var(--color-fg-1)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-fg-0)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                    aria-label="Contactar por WhatsApp"
                  >
                    <MessageCircle size={15} aria-hidden="true" />
                    WhatsApp
                  </a>
                )}
              </div>
              <div className="flex border border-[var(--landing-border)]" role="group" aria-label="Cambiar apariencia">
                <button
                  type="button"
                  title="Vista clara"
                  aria-label="Vista clara"
                  aria-pressed={theme === "light"}
                  onClick={() => setTheme("light")}
                  className={`grid h-10 w-10 cursor-pointer place-items-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${theme === "light" ? "bg-[var(--color-accent)] text-[var(--landing-accent-ink)]" : "text-[var(--color-fg-3)] hover:text-[var(--color-fg-0)]"}`}
                >
                  <Sun size={15} />
                </button>
                <button
                  type="button"
                  title="Vista oscura"
                  aria-label="Vista oscura"
                  aria-pressed={theme === "dark"}
                  onClick={() => setTheme("dark")}
                  className={`grid h-10 w-10 cursor-pointer place-items-center border-l border-[var(--landing-border)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${theme === "dark" ? "bg-[var(--color-accent)] text-[var(--landing-accent-ink)]" : "text-[var(--color-fg-3)] hover:text-[var(--color-fg-0)]"}`}
                >
                  <Moon size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-[var(--landing-border)] pt-4 text-[11px] text-[var(--color-fg-3)]">
          © {new Date().getFullYear()} iot bees · Plataforma para operaciones IoT.
        </div>
      </div>
    </footer>
  );
}
