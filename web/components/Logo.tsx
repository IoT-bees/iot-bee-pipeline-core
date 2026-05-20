import { cn } from "@/lib/cn";

interface LogoProps {
  size?: number;
  className?: string;
}

export function BeeLogo({ size = 28, className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn("inline-block shrink-0", className)}
    >
      <ellipse
        cx="9.5"
        cy="11"
        rx="5.5"
        ry="3.5"
        fill="var(--color-accent)"
        opacity="0.45"
        transform="rotate(-25 9.5 11)"
      />
      <ellipse
        cx="22.5"
        cy="11"
        rx="5.5"
        ry="3.5"
        fill="var(--color-accent)"
        opacity="0.45"
        transform="rotate(25 22.5 11)"
      />
      <ellipse cx="16" cy="19" rx="7" ry="9.5" fill="var(--color-accent)" />
      <rect x="9.2" y="14.2" width="13.6" height="2" fill="var(--color-bg-base)" />
      <rect x="9.2" y="18.6" width="13.6" height="2" fill="var(--color-bg-base)" />
      <rect x="9.2" y="23" width="13.6" height="2" fill="var(--color-bg-base)" />
      <path
        d="M14 10.5 L11.5 5.5"
        stroke="var(--color-accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M18 10.5 L20.5 5.5"
        stroke="var(--color-accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="11.5" cy="5.5" r="1.4" fill="var(--color-accent)" />
      <circle cx="20.5" cy="5.5" r="1.4" fill="var(--color-accent)" />
    </svg>
  );
}

export function BrandMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BeeLogo size={size} />
      <span className="font-mono font-bold tracking-[2px] text-[var(--color-accent)]">
        iot bees //
      </span>
    </span>
  );
}
