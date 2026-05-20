import { cn } from "@/lib/cn";

type Tone = "default" | "accent" | "danger";

const tones: Record<Tone, string> = {
  default: "border-[#1f1f1f]",
  accent: "border-[#1f1f1f] border-l-2 border-l-[var(--color-accent)]",
  danger: "border-[#1f1f1f] border-l-2 border-l-[var(--color-danger)]",
};

export function Panel({
  tone = "default",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-[var(--color-bg-panel)] border p-4 rounded-[3px]",
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
