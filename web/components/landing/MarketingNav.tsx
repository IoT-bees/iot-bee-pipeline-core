import Link from "next/link";
import { BrandMark } from "@/components/Logo";

export function MarketingNav() {
  return (
    <nav className="px-4 sm:px-6 py-4 flex justify-between items-center text-[14px] font-mono border-b border-[var(--color-accent)]">
      <Link href="/"><BrandMark size={26} /></Link>
      <div className="flex items-center gap-4">
        <Link href="/login" className="text-[15px] font-bold text-[var(--color-fg-2)] hover:text-[var(--color-accent)] transition-colors">
          Ingresar
        </Link>
      </div>
    </nav>
  );
}
