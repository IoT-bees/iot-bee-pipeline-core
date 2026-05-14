import Link from "next/link";

export function Hero() {
  return (
    <section className="px-4 sm:px-6 lg:px-12 py-16 lg:py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(0,255,136,.05) 2px, rgba(0,255,136,.05) 3px)",
        }}
      />
      <div className="relative max-w-[1024px]">
        <span className="inline-block border border-[var(--color-accent)] text-[var(--color-accent)] px-2 py-0.5 text-[10px] tracking-[2px] mb-4">
          v0.1.0 · open source
        </span>
        <h1 className="font-mono font-bold text-[36px] sm:text-[60px] leading-[1.05] tracking-[-2px]">
          ingest. <span style={{ color: "var(--color-accent)" }}>validate.</span>
          <br />
          persist. <span className="line-through text-[#555]">repeat.</span>
        </h1>
        <p className="t-mono mt-4 max-w-[600px]">
          {"// "}a rust iot pipeline.
          <br />
          {"// "}rabbitmq · mqtt · kafka in, influxdb out.
          <br />
          {"// "}actor-driven, schema-validated, self-hosted. zero magic.
        </p>
        <div className="flex flex-wrap gap-3 items-center mt-6">
          <Link
            href="/login"
            className="bg-[var(--color-accent)] text-[var(--color-bg-base)] font-bold px-4 py-2 text-[12px] rounded-[2px]"
          >
            $ get started_
          </Link>
          <a
            href="https://github.com/manuelmj/iot-bee"
            target="_blank"
            rel="noreferrer"
            className="border border-[#333] text-[var(--color-fg-1)] px-4 py-2 text-[12px] rounded-[2px]"
          >
            view on github
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-10">
          <div>
            <div className="t-mono">{"// "}per message</div>
            <div className="t-display" style={{ fontSize: 28 }}>
              ~0.4ms
            </div>
          </div>
          <div>
            <div className="t-mono">{"// "}brokers supported</div>
            <div className="t-display" style={{ fontSize: 28 }}>
              3
            </div>
          </div>
          <div>
            <div className="t-mono">{"// "}replicas / pipeline</div>
            <div className="t-display" style={{ fontSize: 28 }}>
              N
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/login"
        className="fixed bottom-0 left-0 right-0 sm:hidden bg-[var(--color-accent)] text-[var(--color-bg-base)] text-center font-bold py-3 text-[12px] z-30"
      >
        $ get started_
      </Link>
    </section>
  );
}
