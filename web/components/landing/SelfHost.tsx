export function SelfHost() {
  return (
    <section className="px-4 sm:px-6 lg:px-12 py-16 border-t border-[#1f1f1f]">
      <h2 className="t-section mb-6">{"// "}self-host</h2>
      <pre className="text-[11px] text-[var(--color-accent)] bg-[var(--color-bg-panel)] border border-[#1f1f1f] p-4 rounded-[3px] overflow-x-auto">
{`$ git clone https://github.com/manuelmj/iot-bee.git
$ sqlx migrate run --database-url sqlite://data/iot-bee.db
$ JWT_SECRET=change-me make run`}
      </pre>
      <p className="t-mono mt-4">
        {"// "}MIT licensed · self-hosted · no telemetry
      </p>
    </section>
  );
}
