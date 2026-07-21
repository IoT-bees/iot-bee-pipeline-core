import Link from "next/link";
import { BrandMark } from "@/components/Logo";

interface ErrorAction {
  href: string;
  label: string;
  primary?: boolean;
}

export function ErrorView({
  code,
  eyebrow,
  title,
  body,
  actions,
  reset,
}: {
  code: string;
  eyebrow: string;
  title: string;
  body: string;
  actions: ErrorAction[];
  reset?: () => void;
}) {
  return (
    <main className="min-h-screen relative overflow-hidden bg-[var(--color-bg-base)] px-4 py-8 sm:px-6 lg:px-12 flex items-center">
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,179,0,.05) 2px, rgba(255,179,0,.05) 3px)",
        }}
      />
      <section className="relative max-w-[920px] w-full mx-auto border border-[var(--color-border)] bg-[var(--color-bg-panel)] rounded-[3px] p-6 sm:p-10 shadow-[0_18px_45px_rgba(0,0,0,.12)]">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-10">
          <BrandMark size={30} />
          <span className="text-[11px] uppercase text-[var(--color-fg-4)] border border-[var(--color-border)] px-3 py-1 rounded-[2px]">
            {eyebrow}
          </span>
        </div>

        <div className="grid lg:grid-cols-[220px_1fr] gap-8 items-start">
          <div className="font-mono font-bold text-[76px] sm:text-[112px] leading-none text-[var(--color-accent)]">
            {code}
          </div>
          <div>
            <div className="t-section mb-3">Estado de la aplicación</div>
            <h1 className="text-[34px] sm:text-[48px] leading-[1.05] font-bold text-[var(--color-fg-0)]">
              {title}
            </h1>
            <p className="mt-5 max-w-[620px] text-[15px] sm:text-[16px] leading-[1.7] text-[var(--color-fg-3)]">
              {body}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={
                    action.primary
                      ? "bg-[var(--color-accent)] text-[var(--color-bg-base)] font-bold border border-[var(--color-accent)] px-5 py-3 rounded-[2px] hover:bg-[var(--color-accent-dim)] hover:border-[var(--color-accent-dim)] transition-colors"
                      : "border border-[var(--color-border)] text-[var(--color-fg-1)] px-5 py-3 rounded-[2px] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
                  }
                >
                  {action.label}
                </Link>
              ))}
              {reset && (
                <button
                  type="button"
                  onClick={reset}
                  className="border border-[var(--color-border)] text-[var(--color-fg-1)] px-5 py-3 rounded-[2px] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
                >
                  Reintentar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--color-border)] pt-4 text-[12px] font-mono text-[var(--color-fg-4)]">
          Recibir · validar · entregar
        </div>
      </section>
    </main>
  );
}
