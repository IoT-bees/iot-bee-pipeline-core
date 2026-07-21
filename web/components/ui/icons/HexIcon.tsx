import { cn } from "@/lib/cn";

interface HexIconProps {
  size?: number;
  filled?: boolean;
  className?: string;
}

export function HexIcon({ size = 14, filled = false, className }: HexIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn("inline-block shrink-0 text-[var(--color-accent)]", className)}
    >
      <polygon
        points="12,2 21,7 21,17 12,22 3,17 3,7"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}
