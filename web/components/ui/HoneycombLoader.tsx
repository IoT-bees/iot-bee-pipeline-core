const cells = [
  { points: "43,20.6 51.5,5.9 68.5,5.9 77,20.6 68.5,35.3 51.5,35.3", opacity: 0.4 },
  { points: "17.5,35.3 26,20.6 43,20.6 51.5,35.3 43,50 26,50", opacity: 0.55 },
  { points: "68.5,35.3 77,20.6 94,20.6 102.5,35.3 94,50 77,50", opacity: 0.7 },
  { points: "43,50 51.5,35.3 68.5,35.3 77,50 68.5,64.7 51.5,64.7", opacity: 1 },
  { points: "17.5,64.7 26,50 43,50 51.5,64.7 43,79.4 26,79.4", opacity: 0.85 },
  { points: "68.5,64.7 77,50 94,50 102.5,64.7 94,79.4 77,79.4", opacity: 0.7 },
  { points: "43,79.4 51.5,64.7 68.5,64.7 77,79.4 68.5,94.1 51.5,94.1", opacity: 0.55 },
];

export function HoneycombMark() {
  return (
    <svg viewBox="0 0 120 100" className="h-20 w-24" aria-hidden="true">
      {cells.map(({ points, opacity }, index) => (
        <polygon
          key={index}
          points={points}
          fill="var(--color-accent)"
          opacity={opacity}
          className="loader-honey-cell-svg"
          style={{ animationDelay: `${index * 100}ms` }}
        />
      ))}
    </svg>
  );
}

export function HoneycombLoader({ label = "Cargando" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8" role="status" aria-live="polite">
      <HoneycombMark />
      {label && (
        <span className="text-[12px] uppercase tracking-[1.5px] text-[var(--color-fg-3)]">
          {label}
        </span>
      )}
    </div>
  );
}
