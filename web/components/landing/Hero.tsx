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
        <span className="inline-block border border-[var(--color-accent)] text-[var(--color-accent)] px-3 py-1 text-[12px] tracking-[2px] mb-6">
          v0.1.0 · open source · MIT
        </span>
        <h1 className="font-mono font-bold text-[44px] sm:text-[68px] leading-[1.05] tracking-[-2px]">
          ingest. <span style={{ color: "var(--color-accent)" }}>validate.</span>
          <br />
          persist. <span className="line-through text-[#555]">repeat.</span>
        </h1>

        <p className="mt-6 max-w-[680px] text-[18px] leading-[1.55] text-[var(--color-fg-1)]">
          A self-hosted platform for moving IoT data from your sensors to your
          database — without writing glue code.
        </p>
        <p className="mt-3 max-w-[680px] text-[15px] leading-[1.6] text-[var(--color-fg-3)]">
          Connect any message broker, define a schema in seconds, transform fields
          on the fly, and stream the result to InfluxDB or a local log. Built in
          Rust, runs on a single binary, scales with replicas.
        </p>

        <div className="flex flex-wrap gap-3 items-center mt-8">
          <Link
            href="/login"
            className="bg-[var(--color-accent)] text-[var(--color-bg-base)] font-bold px-6 py-3 text-[15px] rounded-[2px] hover:bg-[var(--color-accent-dim)] transition-colors"
          >
            ▸ Try the demo
          </Link>
          <a
            href="https://github.com/manuelmj/iot-bee"
            target="_blank"
            rel="noreferrer"
            className="border border-[#444] text-[var(--color-fg-1)] px-6 py-3 text-[15px] rounded-[2px] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
          >
            view on GitHub →
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-12">
          <div>
            <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-fg-3)]">
              latency / msg
            </div>
            <div className="font-mono font-bold text-[32px] text-[var(--color-fg-0)] tracking-[-1px]">
              ~0.4ms
            </div>
          </div>
          <div>
            <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-fg-3)]">
              brokers supported
            </div>
            <div className="font-mono font-bold text-[32px] text-[var(--color-fg-0)] tracking-[-1px]">
              3
            </div>
            <div className="text-[12px] text-[var(--color-fg-3)] mt-1">
              RabbitMQ · MQTT · Kafka
            </div>
          </div>
          <div>
            <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-fg-3)]">
              replicas / pipeline
            </div>
            <div className="font-mono font-bold text-[32px] text-[var(--color-fg-0)] tracking-[-1px]">
              N
            </div>
            <div className="text-[12px] text-[var(--color-fg-3)] mt-1">
              scale workers per stream
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
