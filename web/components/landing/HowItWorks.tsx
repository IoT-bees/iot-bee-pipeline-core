import { Panel } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
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
    <div className="grid grid-cols-1 lg:grid-cols-[120px_320px_1fr] gap-6 items-start">
      <div
        className="t-display"
        style={{ fontSize: 48, color: "var(--color-accent)" }}
      >
        0{n}
      </div>
      <div>
        <h3 className="t-title mb-1">{title}</h3>
        <p className="t-mono">{body}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section
      id="how"
      className="px-4 sm:px-6 lg:px-12 py-16 border-t border-[#1f1f1f]"
    >
      <h2 className="t-section mb-8">{"// "}how it works</h2>
      <div className="flex flex-col gap-16">
        <Step n={1} title="define a data source" body="// point iot-bee at your broker">
          <Panel className="max-w-[480px]">
            <FormField label="NAME">
              <Input value="temp-rabbit" readOnly />
            </FormField>
            <FormField label="QUEUE">
              <Input value="sensor.temperature" readOnly />
            </FormField>
          </Panel>
        </Step>
        <Step n={2} title="define the schema" body="// fields, ranges, transforms.">
          <Panel className="max-w-[480px]">
            <pre className="text-[10px] text-[var(--color-fg-2)] whitespace-pre-wrap">
{`{
  "name": "temp-schema",
  "fields": [
    { "name": "temperature",
      "field_type": "float",
      "min": -50, "max": 150,
      "operations": [
        { "operator": "Multiply", "operand": 1.8 },
        { "operator": "Add",      "operand": 32  }
      ]
    }
  ]
}`}
            </pre>
          </Panel>
        </Step>
        <Step n={3} title="connect a pipeline" body="// glue source + schema + store.">
          <div className="flex gap-3 max-w-[640px] flex-wrap">
            <Panel className="flex-1 min-w-[140px]">
              <div className="t-label">{"// "}SOURCE</div>
              <div>temp-rabbit</div>
            </Panel>
            <Panel className="flex-1 min-w-[140px]">
              <div className="t-label">{"// "}SCHEMA</div>
              <div>temp-schema</div>
            </Panel>
            <Panel className="flex-1 min-w-[140px]">
              <div className="t-label">{"// "}STORE</div>
              <div>influx-prod</div>
            </Panel>
          </div>
        </Step>
        <Step n={4} title="start and monitor" body="// click start. watch throughput.">
          <Panel className="max-w-[480px] flex items-center justify-between">
            <div>
              <div className="t-label">{"// "}THROUGHPUT</div>
              <div className="t-display" style={{ fontSize: 28 }}>
                3.1k{" "}
                <span className="text-[var(--color-fg-3)] text-[12px]">msg/s</span>
              </div>
            </div>
            <Pill state="running">RUNNING</Pill>
          </Panel>
        </Step>
      </div>
    </section>
  );
}
