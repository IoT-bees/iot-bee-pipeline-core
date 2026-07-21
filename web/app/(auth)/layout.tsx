import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-[460px]">
        <div className="flex justify-between items-center mb-10">
          <Link
            href="/"
            aria-label="Volver al inicio"
            className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold leading-none text-[var(--color-accent-strong)] hover:text-[var(--color-accent)] transition-colors"
          >
            <ArrowLeft size={13} aria-hidden="true" /> Volver
          </Link>
          <Link href="/">
            <BrandMark size={22} />
          </Link>
        </div>
        {children}
      </div>
    </main>
  );
}
