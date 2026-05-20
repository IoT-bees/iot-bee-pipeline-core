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
    tag: "industrial",
    title: "Factory floor",
    body:
      "Watch temperature, vibration and pressure live. Alert when something is off, keep a clean history for shift reports.",
    icon: Factory,
  },
  {
    tag: "agriculture",
    title: "Smart farming",
    body:
      "Soil moisture, humidity and EC from field stations, all in one place. Normalize the units, ignore the broken stations.",
    icon: Sprout,
  },
  {
    tag: "energy",
    title: "Power monitoring",
    body:
      "Meter readings cleaned and converted to kWh on the fly. Store raw and computed for the audit you didn't know you'd need.",
    icon: Zap,
  },
  {
    tag: "buildings",
    title: "Building automation",
    body:
      "Centralize HVAC, occupancy and air quality from many buildings. Drop bad packets, forward clean records to your analytics.",
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
          {"// "}use cases
        </div>
        <h2 className="text-[28px] sm:text-[36px] font-bold tracking-[-1px] text-[var(--color-fg-0)]">
          Built for the messy reality of the field.
        </h2>
        <p className="text-[15px] text-[var(--color-fg-3)] mt-3 max-w-[680px]">
          If your data sits between sensors and a database — and you would
          rather not write a custom service for every project — iot bees fits.
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
