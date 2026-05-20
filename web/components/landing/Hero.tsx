import Link from "next/link";

export function Hero() {
  return (
    <section className="px-4 sm:px-6 lg:px-12 pt-16 lg:pt-24 pb-28 sm:pb-16 lg:pb-24 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(0,255,136,.05) 2px, rgba(0,255,136,.05) 3px)",
        }}
      />
      <div className="relative max-w-[1024px] mx-auto sm:mx-0 text-center sm:text-left">
        <span className="inline-block border border-[var(--color-accent)] text-[var(--color-accent)] px-3 py-1 text-[12px] tracking-[2px] mb-6">
          v0.1.0 · open source · MIT
        </span>
        <h1 className="font-mono font-bold text-[44px] sm:text-[68px] leading-[1.05] tracking-[-2px]">
          ingest. <span style={{ color: "var(--color-accent)" }}>validate.</span>
          <br />
          persist. <span className="line-through text-[#555]">repeat.</span>
        </h1>

        <p className="mt-6 mx-auto sm:mx-0 max-w-[680px] text-[18px] leading-[1.55] text-[var(--color-fg-1)]">
          Move data from your sensors to your database — without writing a single
          line of glue code.
        </p>
        <p className="mt-3 mx-auto sm:mx-0 max-w-[680px] text-[15px] leading-[1.6] text-[var(--color-fg-3)]">
          Connect any broker, describe your data in a visual editor, and stream it
          clean to where you need it. Self-hosted, runs on a single binary. Yours.
        </p>

        <div className="flex gap-2 sm:gap-3 items-stretch sm:items-center mt-8 justify-center sm:justify-start sm:flex-wrap">
          <Link
            href="/login"
            className="flex-1 sm:flex-none text-center bg-[var(--color-accent)] text-[var(--color-bg-base)] font-bold px-3 sm:px-6 py-3 text-[14px] sm:text-[15px] rounded-[2px] hover:bg-[var(--color-accent-dim)] transition-colors"
          >
            ▸ Try the demo
          </Link>
          <a
            href="https://github.com/manuelmj/iot-bee"
            target="_blank"
            rel="noreferrer"
            className="flex-1 sm:flex-none text-center border border-[#444] text-[var(--color-fg-1)] px-3 sm:px-6 py-3 text-[14px] sm:text-[15px] rounded-[2px] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
          >
            view on GitHub →
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
          <div className="text-center sm:text-left">
            <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-fg-3)]">
              time to first stream
            </div>
            <div className="font-mono font-bold text-[32px] text-[var(--color-fg-0)] tracking-[-1px]">
              ~5 min
            </div>
            <div className="text-[12px] text-[var(--color-fg-3)] mt-1">
              from install to data flowing
            </div>
          </div>
          <div className="text-center sm:text-left">
            <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-fg-3)]">
              code you write
            </div>
            <div className="font-mono font-bold text-[32px] text-[var(--color-fg-0)] tracking-[-1px]">
              0 lines
            </div>
            <div className="text-[12px] text-[var(--color-fg-3)] mt-1">
              everything from the web UI
            </div>
          </div>
          <div className="text-center sm:text-left">
            <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-fg-3)]">
              where your data lives
            </div>
            <div className="font-mono font-bold text-[32px] text-[var(--color-fg-0)] tracking-[-1px]">
              your DB
            </div>
            <div className="text-[12px] text-[var(--color-fg-3)] mt-1">
              never ours · no SaaS, no telemetry
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/login"
        className="fixed bottom-0 left-0 right-0 sm:hidden bg-[var(--color-accent)] text-[var(--color-bg-base)] text-center font-bold py-4 text-[15px] z-30"
      >
        ▸ Try the demo
      </Link>
    </section>
  );
}
