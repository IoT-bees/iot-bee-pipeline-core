import { cn } from "@/lib/cn";

export function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-accent)] mb-2">
        {"// "}{number}
      </div>
      <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-1px] text-[var(--color-fg-0)] mb-5">
        {title}
      </h2>
      <div className="text-[15px] leading-[1.7] text-[var(--color-fg-2)] flex flex-col gap-4 max-w-[760px]">
        {children}
      </div>
    </section>
  );
}

export function SubSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className={cn(id && "scroll-mt-24", "mt-6")}>
      <h3 className="text-[19px] font-bold text-[var(--color-fg-0)] mb-3 tracking-[-0.5px]">
        {title}
      </h3>
      <div className="text-[15px] leading-[1.7] text-[var(--color-fg-2)] flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}

export function CodeBlock({
  language,
  children,
}: {
  language?: string;
  children: string;
}) {
  return (
    <div className="bg-[var(--color-bg-panel)] border border-[#1f1f1f] rounded-[3px] overflow-hidden">
      {language && (
        <div className="px-4 py-1.5 text-[10px] tracking-[2px] uppercase text-[var(--color-fg-4)] border-b border-[#1f1f1f]">
          {language}
        </div>
      )}
      <pre className="text-[13px] leading-[1.6] text-[var(--color-fg-1)] overflow-x-auto whitespace-pre p-4 font-mono">
        {children}
      </pre>
    </div>
  );
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-[13px] bg-[var(--color-bg-elev)] border border-[#1f1f1f] px-1.5 py-[1px] rounded-[2px] text-[var(--color-accent)] font-mono">
      {children}
    </code>
  );
}

type CalloutKind = "info" | "warn" | "danger";

export function Callout({
  kind = "info",
  title,
  children,
}: {
  kind?: CalloutKind;
  title?: string;
  children: React.ReactNode;
}) {
  const tone =
    kind === "danger"
      ? "border-l-[var(--color-danger)]"
      : kind === "warn"
      ? "border-l-[var(--color-warn)]"
      : "border-l-[var(--color-accent)]";
  const label =
    kind === "danger" ? "× heads up" : kind === "warn" ? "▲ note" : "// tip";
  const labelColor =
    kind === "danger"
      ? "text-[var(--color-danger)]"
      : kind === "warn"
      ? "text-[var(--color-warn)]"
      : "text-[var(--color-accent)]";
  return (
    <div
      className={cn(
        "bg-[var(--color-bg-panel)] border border-[#1f1f1f] border-l-2 p-4 rounded-[3px]",
        tone,
      )}
    >
      <div
        className={cn(
          "text-[11px] tracking-[2px] uppercase font-mono mb-2",
          labelColor,
        )}
      >
        {title ? `${label} · ${title}` : label}
      </div>
      <div className="text-[14px] leading-[1.6] text-[var(--color-fg-2)]">
        {children}
      </div>
    </div>
  );
}

export function Table({
  head,
  rows,
}: {
  head: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] font-mono border-collapse">
        <thead>
          <tr className="text-left">
            {head.map((h) => (
              <th
                key={h}
                className="border-b border-[var(--color-accent)] px-3 py-2.5 text-[var(--color-accent)] tracking-[1.5px] text-[11px] uppercase font-normal"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--color-bg-elev)]">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="border-b border-dashed border-[#1f1f1f] px-3 py-2.5 align-top text-[var(--color-fg-2)]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Steps({ items }: { items: { title: string; body: React.ReactNode }[] }) {
  return (
    <ol className="flex flex-col gap-5 mt-2">
      {items.map((item, i) => (
        <li key={i} className="grid grid-cols-[40px_1fr] gap-4 items-start">
          <span className="font-mono font-bold text-[20px] text-[var(--color-accent)] leading-none mt-0.5">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <div className="text-[16px] font-bold text-[var(--color-fg-0)] mb-1">
              {item.title}
            </div>
            <div className="text-[14px] text-[var(--color-fg-2)] leading-[1.6]">
              {item.body}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
