function Box({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="border border-[var(--color-fg-1)] px-4 py-3 w-full sm:w-auto sm:min-w-[150px]">
      <div className="font-bold text-[var(--color-fg-0)] text-[15px] mb-1">
        {title}
      </div>
      <div className="text-[12px] text-[var(--color-fg-3)]">{sub}</div>
    </div>
  );
}

export function ConceptStrip() {
  return (
    <section
      id="what"
      className="border-y border-[#1f1f1f] px-4 sm:px-6 lg:px-12 py-8 bg-[#080808]"
    >
      <div className="sm:hidden flex flex-col items-stretch gap-3 text-[14px] font-mono">
        <Box title="BROKER" sub="RabbitMQ · MQTT · Kafka" />
        <span className="text-[var(--color-accent)] text-[22px] text-center leading-none">
          ↓
        </span>
        <Box title="SCHEMA" sub="validate · transform" />
        <span className="text-[var(--color-accent)] text-[22px] text-center leading-none">
          ↓
        </span>
        <Box title="STORE" sub="InfluxDB · local log" />
      </div>

      <div className="hidden sm:flex flex-wrap items-center gap-4 text-[14px] font-mono">
        <Box title="BROKER" sub="RabbitMQ · MQTT · Kafka" />
        <span className="text-[var(--color-accent)] text-[24px]">→</span>
        <Box title="SCHEMA" sub="validate · transform" />
        <span className="text-[var(--color-accent)] text-[24px]">→</span>
        <Box title="STORE" sub="InfluxDB · local log" />
      </div>
    </section>
  );
}
