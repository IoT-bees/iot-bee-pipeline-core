import { Panel } from "@/components/ui/Panel";

export function Pillars() {
  const items = [
    {
      title: "INGEST",
      body: "// connect any broker.",
      code: `{ "host": "amqp://...", "queue": "sensor_data" }`,
    },
    {
      title: "VALIDATE",
      body: "// schemas with min/max and arithmetic.",
      code: `{ "field_type": "float", "min": -50, "max": 150,
  "operations": [{ "operator": "Multiply", "operand": 1.8 }] }`,
    },
    {
      title: "PERSIST",
      body: "// influxdb tags + fields, or a flat log.",
      code: `{ "persistenceType": "INFLUX_DB",
  "measurement": "temperature",
  "tag_fields": ["location"] }`,
    },
  ];
  return (
    <section className="px-4 sm:px-6 lg:px-12 py-12 grid lg:grid-cols-3 gap-4">
      {items.map((it) => (
        <Panel key={it.title}>
          <div className="t-section mb-2">{"// "}{it.title.toLowerCase()}</div>
          <div className="t-body mb-4">{it.body}</div>
          <pre className="text-[10px] text-[var(--color-fg-3)] overflow-x-auto whitespace-pre-wrap">
            {it.code}
          </pre>
        </Panel>
      ))}
    </section>
  );
}
