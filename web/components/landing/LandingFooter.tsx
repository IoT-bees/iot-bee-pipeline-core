import Link from "next/link";
import { BrandMark } from "@/components/Logo";

export function LandingFooter() {
  return (
    <footer className="px-4 sm:px-6 lg:px-12 py-10 border-t border-[#1f1f1f] font-mono">
      <div className="max-w-[1024px] flex flex-wrap justify-between gap-6">
        <div className="flex flex-col gap-3">
          <Link href="/">
            <BrandMark size={26} />
          </Link>
          <span className="text-[13px] text-[var(--color-fg-3)] max-w-[320px]">
            Self-hosted IoT data pipelines, written in Rust, configurable
            through a web UI.
          </span>
        </div>

        <div className="flex flex-col gap-2 text-[13px]">
          <span className="text-[11px] tracking-[2px] uppercase text-[var(--color-fg-4)] mb-1">
            {"// "}links
          </span>
          <Link href="/login" className="text-[var(--color-fg-2)] hover:text-[var(--color-accent)]">
            Launch app
          </Link>
          <a
            href="https://github.com/manuelmj/iot-bee"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-fg-2)] hover:text-[var(--color-accent)]"
          >
            GitHub
          </a>
          <Link href="/docs" className="text-[var(--color-fg-2)] hover:text-[var(--color-accent)]">
            Documentation
          </Link>
        </div>

        <div className="flex flex-col gap-2 text-[13px]">
          <span className="text-[11px] tracking-[2px] uppercase text-[var(--color-fg-4)] mb-1">
            {"// "}meta
          </span>
          <span className="text-[var(--color-fg-3)]">MIT · v0.1.0</span>
          <span className="text-[var(--color-fg-3)]">
            by Manuel Manjarrez
            <br />
            & Ovidio Andrade
          </span>
        </div>
      </div>
    </footer>
  );
}
