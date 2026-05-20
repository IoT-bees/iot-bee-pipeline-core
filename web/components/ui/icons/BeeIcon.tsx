import { cn } from "@/lib/cn";

interface BeeIconProps {
  size?: number;
  className?: string;
}

export function BeeIcon({ size = 14, className }: BeeIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn("inline-block shrink-0 text-[var(--color-accent)]", className)}
    >
      <ellipse
        cx="7"
        cy="9"
        rx="3.2"
        ry="2"
        transform="rotate(-25 7 9)"
        fill="currentColor"
        opacity="0.45"
      />
      <ellipse
        cx="17"
        cy="9"
        rx="3.2"
        ry="2"
        transform="rotate(25 17 9)"
        fill="currentColor"
        opacity="0.45"
      />
      <ellipse cx="12" cy="14" rx="4.5" ry="6" fill="currentColor" />
      <line x1="7.7" x2="16.3" y1="12" y2="12" stroke="var(--color-bg-panel)" strokeWidth="1.3" />
      <line x1="7.7" x2="16.3" y1="15" y2="15" stroke="var(--color-bg-panel)" strokeWidth="1.3" />
      <line x1="7.7" x2="16.3" y1="18" y2="18" stroke="var(--color-bg-panel)" strokeWidth="1.3" />
      <path d="M10.5 8 L9 4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M13.5 8 L15 4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="9" cy="4.5" r="0.9" fill="currentColor" />
      <circle cx="15" cy="4.5" r="0.9" fill="currentColor" />
    </svg>
  );
}
