export function ConceptStrip() {
  return (
    <section className="border-y border-[#1f1f1f] px-4 sm:px-6 lg:px-12 py-8">
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
        <span className="border border-[var(--color-fg-1)] px-3 py-2">
          <b>BROKER</b>
          <br />
          rabbitmq · mqtt · kafka
        </span>
        <span className="text-[var(--color-accent)] text-lg">→</span>
        <span className="border border-[var(--color-fg-1)] px-3 py-2">
          <b>SCHEMA</b>
          <br />
          validate · transform
        </span>
        <span className="text-[var(--color-accent)] text-lg">→</span>
        <span className="border border-[var(--color-fg-1)] px-3 py-2">
          <b>STORE</b>
          <br />
          influxdb · local log
        </span>
      </div>
    </section>
  );
}
