import { Inbox, Radio, ListChecks, Database } from "lucide-react";
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

function FieldRow({
  name,
  type,
  range,
}: {
  name: string;
  type: string;
  range: string;
}) {
  return (
    <Panel className="p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="font-bold text-[var(--color-fg-0)] text-[14px] sm:min-w-[110px]">
            {name}
          </div>
          <span className="bg-[#1a1a1a] border border-[var(--color-accent)] text-[var(--color-accent)] px-2 py-[1px] text-[10px] rounded-[2px] tracking-[1px]">
            {type}
          </span>
          <span className="bg-[#1a1a1a] text-[var(--color-fg-3)] px-2 py-[1px] text-[10px] rounded-[2px] tracking-[1px]">
            required
          </span>
        </div>
        <span className="sm:ml-auto text-[12px] text-[var(--color-fg-3)] font-mono">
          {range}
        </span>
      </div>
    </Panel>
  );
}

function PipelineCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Inbox;
  label: string;
  value: string;
}) {
  return (
    <Panel className="flex-1 min-w-[160px] p-4 flex items-center gap-3">
      <Icon
        size={26}
        strokeWidth={1.75}
        className="text-[var(--color-accent)] shrink-0"
      />
      <div>
        <div className="text-[11px] tracking-[2px] uppercase text-[var(--color-fg-3)]">
          {"// "}
          {label}
        </div>
        <div className="text-[14px] font-bold text-[var(--color-fg-0)]">{value}</div>
      </div>
    </Panel>
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
          {"// "}repeatable delivery
        </div>
        <h2 className="text-[28px] sm:text-[36px] font-bold tracking-[-1px] text-[var(--color-fg-0)]">
          Four screens from quote to production handoff.
        </h2>
        <p className="text-[15px] text-[var(--color-fg-3)] mt-3 max-w-[640px]">
          Build the first project carefully, then reuse the same broker,
          payload and destination pattern for the next customer. No YAML to
          write, no rebuild, no restart.
        </p>
      </div>

      <div className="flex flex-col gap-16 lg:gap-20">
        <Step
          n={1}
          title="Create a client project"
          body="Register the customer deployment, pick the broker type and save the connection your team will reuse."
        >
          <Panel className="max-w-[520px] p-5">
            <div className="text-[11px] tracking-[2px] uppercase text-[var(--color-fg-3)] mb-1">
              {"// "}TYPE
            </div>
            <div className="bg-[var(--color-bg-base)] border border-[#2a2a2a] px-3 py-2.5 mb-4 text-[14px] flex justify-between items-center">
              <span className="inline-flex items-center gap-3 text-[var(--color-fg-0)]">
                <span className="w-9 h-9 border border-[#2a2a2a] rounded-[3px] bg-[#0A0A0A] flex items-center justify-center">
                  <Inbox
                    size={18}
                    strokeWidth={1.75}
                    className="text-[var(--color-accent)]"
                  />
                </span>
                RabbitMQ
              </span>
              <span className="text-[var(--color-fg-3)]">▾</span>
            </div>

            <div className="text-[11px] tracking-[2px] uppercase text-[var(--color-fg-3)] mb-1">
              {"// "}NAME
            </div>
            <div className="bg-[var(--color-bg-base)] border border-[#2a2a2a] px-3 py-2.5 mb-4 text-[14px] text-[var(--color-fg-0)]">
              Cold chain - client A
            </div>

            <div className="text-[11px] tracking-[2px] uppercase text-[var(--color-fg-3)] mb-1">
              {"// "}QUEUE
            </div>
            <div className="bg-[var(--color-bg-base)] border border-[#2a2a2a] px-3 py-2.5 text-[14px] font-mono text-[var(--color-fg-0)]">
              clients.a.cold-chain.telemetry
            </div>
          </Panel>
        </Step>

        <Step
          n={2}
          title="Normalize the payload"
          body="Describe the fields, units and valid ranges. Broken messages are rejected before they reach the client system."
        >
          <div className="flex flex-col gap-2.5 max-w-[520px]">
            <FieldRow name="temperature" type="FLOAT" range="-50 → 80 °C" />
            <FieldRow name="humidity" type="FLOAT" range="0 → 100 %" />
            <FieldRow name="asset_id" type="STRING" range="client tag" />
            <div className="text-[12px] text-[var(--color-fg-4)] pl-3">
              + add field
            </div>
          </div>
        </Step>

        <Step
          n={3}
          title="Pick the client destination"
          body="Route validated telemetry to the database, webhook or API the client already uses instead of building a custom bridge."
        >
          <div className="flex gap-3 max-w-[640px] flex-wrap">
            <PipelineCard icon={Radio} label="BROKER" value="Client A MQTT" />
            <PipelineCard
              icon={ListChecks}
              label="PAYLOAD"
              value="Cold chain payload"
            />
            <PipelineCard icon={Database} label="DESTINATION" value="Client DB" />
          </div>
        </Step>

        <Step
          n={4}
          title="Operate the project"
          body="Start the pipeline, monitor throughput and scale workers when the installation grows. The goal is a supported recurring service, not a one-off script."
        >
          <Panel className="max-w-[520px] p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-fg-3)]">
                {"// "}THROUGHPUT
              </div>
              <div className="font-mono font-bold text-[30px] text-[var(--color-fg-0)] tracking-[-1px]">
                3.1k{" "}
                <span className="text-[var(--color-fg-3)] text-[13px]">msg/s</span>
              </div>
            </div>
            <svg
              width={140}
              height={42}
              viewBox="0 0 140 42"
              aria-hidden="true"
              className="shrink-0"
            >
              <path
                className="spark-line"
                d="M0,28 L18,26 L36,24 L54,20 L72,22 L90,16 L108,18 L126,10 L140,14"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <Pill state="running">RUNNING</Pill>
          </Panel>
        </Step>
      </div>
    </section>
  );
}
