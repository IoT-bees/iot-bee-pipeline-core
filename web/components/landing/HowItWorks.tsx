import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";

function Step({
  n,
  title,
  body,
  children,
}: {
  n: number;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[100px_360px_1fr] gap-6 lg:gap-8 items-start">
      <div
        className="font-mono font-bold text-[60px] lg:text-[72px] leading-none tracking-[-2px]"
        style={{ color: "var(--color-accent)" }}
      >
        0{n}
      </div>
      <div>
        <h3 className="text-[22px] font-bold text-[var(--color-fg-0)] mb-2 tracking-[-0.5px]">
          {title}
        </h3>
        <p className="text-[15px] leading-[1.6] text-[var(--color-fg-2)]">{body}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section
      id="how"
      className="px-4 sm:px-6 lg:px-12 py-20 border-t border-[#1f1f1f]"
    >
      <div className="max-w-[1024px] mb-12">
        <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-accent)] mb-2">
          {"// "}how it works
        </div>
        <h2 className="text-[28px] sm:text-[36px] font-bold tracking-[-1px] text-[var(--color-fg-0)]">
          Four steps from broker to dashboard.
        </h2>
        <p className="text-[15px] text-[var(--color-fg-3)] mt-3 max-w-[640px]">
          Each step is a single screen in the web app. No YAML to write, no
          rebuild, no restart.
        </p>
      </div>

      <div className="flex flex-col gap-16 lg:gap-20">
        <Step
          n={1}
          title="Connect your broker"
          body="Pick a source type (RabbitMQ, MQTT, Kafka), fill the connection details, and save. iot-bee remembers it."
        >
          <Panel className="max-w-[520px] p-5">
            <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-fg-3)] mb-1">
              {"// "}NAME
            </div>
            <div className="bg-[var(--color-bg-base)] border border-[#2a2a2a] px-3 py-2.5 mb-4 text-[14px] font-mono">
              temp-rabbit
            </div>
            <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-fg-3)] mb-1">
              {"// "}QUEUE
            </div>
            <div className="bg-[var(--color-bg-base)] border border-[#2a2a2a] px-3 py-2.5 text-[14px] font-mono">
              sensor.temperature
            </div>
          </Panel>
        </Step>

        <Step
          n={2}
          title="Describe what data looks like"
          body="A schema lists the fields you expect, their types and ranges, and (optionally) any transformation. Bad messages get dropped, good ones get cleaned."
        >
          <Panel className="max-w-[520px] p-5">
            <pre className="text-[12px] leading-[1.5] text-[var(--color-fg-2)] whitespace-pre-wrap font-mono">
{`{
  "temperature": {
    "type": "float",
    "required": true,
    "validation": { "min": -50, "max": 150 },
    "operation": null
  }
}`}
            </pre>
          </Panel>
        </Step>

        <Step
          n={3}
          title="Wire a pipeline"
          body="A pipeline links one broker, one schema and one store. Pick from dropdowns, hit save, you have a working data path."
        >
          <div className="flex gap-3 max-w-[640px] flex-wrap">
            <Panel className="flex-1 min-w-[150px] p-4">
              <div className="text-[11px] tracking-[2px] uppercase text-[var(--color-fg-3)]">
                {"// "}SOURCE
              </div>
              <div className="text-[15px] font-bold mt-1 text-[var(--color-fg-0)]">
                temp-rabbit
              </div>
            </Panel>
            <Panel className="flex-1 min-w-[150px] p-4">
              <div className="text-[11px] tracking-[2px] uppercase text-[var(--color-fg-3)]">
                {"// "}SCHEMA
              </div>
              <div className="text-[15px] font-bold mt-1 text-[var(--color-fg-0)]">
                temp-schema
              </div>
            </Panel>
            <Panel className="flex-1 min-w-[150px] p-4">
              <div className="text-[11px] tracking-[2px] uppercase text-[var(--color-fg-3)]">
                {"// "}STORE
              </div>
              <div className="text-[15px] font-bold mt-1 text-[var(--color-fg-0)]">
                influx-prod
              </div>
            </Panel>
          </div>
        </Step>

        <Step
          n={4}
          title="Start it and watch"
          body="Press start; iot-bee spins up N actor replicas and starts streaming. Stop, scale up or tear down whenever — no restart needed."
        >
          <Panel className="max-w-[520px] p-5 flex items-center justify-between gap-3">
            <div>
              <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-fg-3)]">
                {"// "}THROUGHPUT
              </div>
              <div className="font-mono font-bold text-[34px] text-[var(--color-fg-0)] tracking-[-1px]">
                3.1k{" "}
                <span className="text-[var(--color-fg-3)] text-[14px]">msg/s</span>
              </div>
            </div>
            <Pill state="running">RUNNING</Pill>
          </Panel>
        </Step>
      </div>
    </section>
  );
}
