import { Panel } from "@/components/ui/Panel";

const cases = [
  {
    tag: "industrial",
    title: "Factory floor telemetry",
    body:
      "Stream temperature, vibration and pressure from PLCs over MQTT, validate against engineering ranges, and persist to InfluxDB for Grafana dashboards.",
  },
  {
    tag: "agriculture",
    title: "Smart farming",
    body:
      "Aggregate field stations (soil moisture, EC, humidity) sent over RabbitMQ, normalize units, and write to a single time-series store for analysis.",
  },
  {
    tag: "energy",
    title: "Power monitoring",
    body:
      "Capture meter readings from Kafka topics, transform raw counts into kWh on the fly, and store both raw and computed values for compliance audits.",
  },
  {
    tag: "buildings",
    title: "Building automation",
    body:
      "Centralize HVAC, occupancy and air-quality streams from multiple buildings, drop bad packets, and forward clean records to your analytics layer.",
  },
];

export function UseCases() {
  return (
    <section
      id="use-cases"
      className="px-4 sm:px-6 lg:px-12 py-20 border-t border-[#1f1f1f] bg-[#080808]"
    >
      <div className="max-w-[1024px] mb-10">
        <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-accent)] mb-2">
          {"// "}use cases
        </div>
        <h2 className="text-[28px] sm:text-[36px] font-bold tracking-[-1px] text-[var(--color-fg-0)]">
          Built for the messy reality of field deployments.
        </h2>
        <p className="text-[15px] text-[var(--color-fg-3)] mt-3 max-w-[680px]">
          If your data sits between sensors and a database — and you would
          rather not write a custom service for every project — iot-bee fits.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {cases.map((c) => (
          <Panel key={c.title} className="p-6">
            <div className="text-[11px] tracking-[2px] uppercase text-[var(--color-accent)] mb-2">
              {"// "}{c.tag}
            </div>
            <h3 className="text-[20px] font-bold text-[var(--color-fg-0)] mb-2 tracking-[-0.5px]">
              {c.title}
            </h3>
            <p className="text-[14px] leading-[1.6] text-[var(--color-fg-2)]">
              {c.body}
            </p>
          </Panel>
        ))}
      </div>
    </section>
  );
}
