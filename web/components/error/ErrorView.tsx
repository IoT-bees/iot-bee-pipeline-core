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
      <div className="absolute -right-24 top-12 h-[320px] w-[320px] rounded-full border border-[var(--color-accent)] opacity-20" />
      <div className="absolute -left-20 bottom-10 h-[220px] w-[220px] rounded-full border border-[var(--color-danger)] opacity-20" />

      <section className="relative max-w-[920px] w-full mx-auto border border-[#1f1f1f] bg-[var(--color-bg-panel)] rounded-[3px] p-6 sm:p-10 shadow-[0_0_80px_rgba(0,0,0,.45)]">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-10">
          <BrandMark size={30} />
          <span className="text-[11px] tracking-[2px] uppercase text-[var(--color-fg-4)] border border-[#333] px-3 py-1 rounded-[2px]">
            {eyebrow}
          </span>
        </div>

        <div className="grid lg:grid-cols-[220px_1fr] gap-8 items-start">
          <div className="font-mono font-bold text-[76px] sm:text-[112px] leading-none tracking-[-6px] text-[var(--color-accent)]">
            {code}
          </div>
          <div>
            <div className="t-section mb-3">{"// "}route signal lost</div>
            <h1 className="text-[34px] sm:text-[48px] leading-[1.05] tracking-[-2px] font-bold text-[var(--color-fg-0)]">
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
                      : "border border-[#333] text-[var(--color-fg-1)] px-5 py-3 rounded-[2px] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
                  }
                >
                  {action.label}
                </Link>
              ))}
              {reset && (
                <button
                  type="button"
                  onClick={reset}
                  className="border border-[#333] text-[var(--color-fg-1)] px-5 py-3 rounded-[2px] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
                >
                  retry
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[#1f1f1f] pt-4 text-[12px] font-mono text-[var(--color-fg-4)]">
          {"// "}ingest · validate · persist · recover
        </div>
      </section>
    </main>
  );
}

