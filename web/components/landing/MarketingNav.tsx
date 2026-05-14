import Link from "next/link";

export function MarketingNav() {
  return (
    <nav className="px-4 sm:px-6 py-3 flex flex-wrap gap-y-2 justify-between items-center text-[11px] font-mono border-b border-[var(--color-accent)]">
      <Link
        href="/"
        className="text-[var(--color-accent)] font-bold tracking-[2px]"
      >
        iot-bee //
      </Link>
      <div className="flex gap-4 text-[var(--color-fg-3)] flex-wrap">
        <a href="#how" className="hover:text-[var(--color-fg-1)]">
          how it works
        </a>
        <a href="#arch" className="hover:text-[var(--color-fg-1)]">
          architecture
        </a>
        <a
          href="https://github.com/manuelmj/iot-bee"
          target="_blank"
          rel="noreferrer"
          className="hover:text-[var(--color-fg-1)]"
        >
          github ↗
        </a>
        <Link href="/login" className="text-[var(--color-accent)]">
          launch app →
        </Link>
      </div>
    </nav>
  );
}
