import { Shield, Server, Unlock, type LucideIcon } from "lucide-react";
import { Panel } from "@/components/ui/Panel";

function Promise({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <Panel className="p-5">
      <div className="w-11 h-11 border border-[var(--color-accent)] rounded-[4px] flex items-center justify-center mb-3">
        <Icon
          size={22}
          strokeWidth={1.75}
          className="text-[var(--color-accent)]"
        />
      </div>
      <div className="text-[15px] font-bold text-[var(--color-fg-0)] mb-1">
        {title}
      </div>
      <div className="text-[13px] leading-[1.55] text-[var(--color-fg-3)]">
        {body}
      </div>
    </Panel>
  );
}

export function SelfHost() {
  return (
    <section className="px-4 sm:px-6 lg:px-12 py-16 border-t border-[#1f1f1f]">
      <div className="max-w-[1024px]">
        <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-accent)] mb-2">
          {"// "}self-host
        </div>
        <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-1px] text-[var(--color-fg-0)] mb-6">
          Yours, on your hardware.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Promise
            icon={Shield}
            title="Your data, always"
            body="Nothing leaves your network. No SaaS, no telemetry, no third-party cloud in the path."
          />
          <Promise
            icon={Server}
            title="One binary, SQLite"
            body="No Docker required, no orchestrator. Runs on a NUC, a Pi, a bare-metal server — whatever you already have."
          />
          <Promise
            icon={Unlock}
            title="MIT licensed"
            body="Fork it, audit it, ship it. No vendor lock-in, no expiring license file."
          />
        </div>

        <details className="mt-8 group">
          <summary className="cursor-pointer text-[12px] tracking-[2px] uppercase text-[var(--color-fg-3)] hover:text-[var(--color-accent)] select-none list-none flex items-center gap-2">
            <span className="inline-block transition-transform group-open:rotate-90">
              ▸
            </span>
            For your DevOps team — three commands
          </summary>
          <pre className="mt-4 text-[14px] leading-[1.6] text-[var(--color-accent)] bg-[var(--color-bg-panel)] border border-[#1f1f1f] p-5 rounded-[3px] overflow-x-auto whitespace-pre font-mono">
{`$ git clone https://github.com/manuelmj/iot-bee.git
$ sqlx migrate run --database-url sqlite://data/iot-bee.db
$ JWT_SECRET=change-me make run`}
          </pre>
        </details>
      </div>
    </section>
  );
}
