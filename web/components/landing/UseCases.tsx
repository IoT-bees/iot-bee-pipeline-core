import {
  Factory,
  Sprout,
  Zap,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";

const cases: {
  tag: string;
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    tag: "cold chain",
    title: "Temperature monitoring package",
    body:
      "Reusable ingestion for refrigerated rooms, trucks and warehouses. Validate sensor ranges, keep bad payloads out and deliver records to the client system.",
    icon: Factory,
  },
  {
    tag: "agriculture",
    title: "Field sensor package",
    body:
      "Normalize soil moisture, humidity and EC from field stations. Reuse the same payload package across farms while each client keeps their own destination.",
    icon: Sprout,
  },
  {
    tag: "energy",
    title: "Meter telemetry package",
    body:
      "Clean meter readings, convert units and forward both raw and computed values so integrators can sell reporting without rebuilding ingestion.",
    icon: Zap,
  },
  {
    tag: "buildings",
    title: "Facilities data package",
    body:
      "Route HVAC, occupancy and air-quality telemetry from many buildings into the tenant database, BI tool or operations API.",
    icon: Building2,
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
          {"// "}integrator packages
        </div>
        <h2 className="text-[28px] sm:text-[36px] font-bold tracking-[-1px] text-[var(--color-fg-0)]">
          Package the messy field work into repeatable services.
        </h2>
        <p className="text-[15px] text-[var(--color-fg-3)] mt-3 max-w-[680px]">
          The product should help an integrator quote faster, deploy faster and
          reuse the same delivery pattern across clients.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {cases.map(({ tag, title, body, icon: Icon }) => (
          <Panel key={title} className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 border border-[var(--color-accent)] rounded-[4px] flex items-center justify-center shrink-0">
                <Icon
                  size={22}
                  strokeWidth={1.75}
                  className="text-[var(--color-accent)]"
                />
              </div>
              <div className="text-[11px] tracking-[2px] uppercase text-[var(--color-accent)]">
                {"// "}
                {tag}
              </div>
            </div>
            <h3 className="text-[20px] font-bold text-[var(--color-fg-0)] mb-2 tracking-[-0.5px]">
              {title}
            </h3>
            <p className="text-[14px] leading-[1.6] text-[var(--color-fg-2)]">
              {body}
            </p>
          </Panel>
        ))}
      </div>
    </section>
  );
}
