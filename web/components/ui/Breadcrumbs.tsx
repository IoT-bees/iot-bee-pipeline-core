import Link from "next/link";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav
      aria-label="breadcrumbs"
      className="text-[11px] tracking-[1.5px] text-[var(--color-fg-4)] font-mono mb-2 flex gap-2"
    >
      {trail.map((c, i) => (
        <span key={i} className="flex items-center gap-2">
          {c.href ? (
            <Link href={c.href} className="hover:text-[var(--color-fg-2)]">
              {c.label}
            </Link>
          ) : (
            <span className="text-[var(--color-fg-2)]">{c.label}</span>
          )}
          {i < trail.length - 1 && <span>/</span>}
        </span>
      ))}
    </nav>
  );
}
