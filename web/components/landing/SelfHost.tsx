export function SelfHost() {
  return (
    <section className="px-4 sm:px-6 lg:px-12 py-16 border-t border-[#1f1f1f]">
      <div className="max-w-[1024px]">
        <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-accent)] mb-2">
          {"// "}self-host
        </div>
        <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-1px] text-[var(--color-fg-0)] mb-3">
          Yours, on your hardware.
        </h2>
        <p className="text-[15px] leading-[1.6] text-[var(--color-fg-2)] max-w-[680px] mb-6">
          A single Rust binary plus a SQLite file. Three commands to a working
          instance — no Docker required, no SaaS account, no telemetry leaving
          your network. <span className="text-[var(--color-fg-3)]">MIT licensed.</span>
        </p>

        <pre className="text-[14px] leading-[1.6] text-[var(--color-accent)] bg-[var(--color-bg-panel)] border border-[#1f1f1f] p-5 rounded-[3px] overflow-x-auto whitespace-pre font-mono">
{`$ git clone https://github.com/manuelmj/iot-bee.git
$ sqlx migrate run --database-url sqlite://data/iot-bee.db
$ JWT_SECRET=change-me make run`}
        </pre>
      </div>
    </section>
  );
}
