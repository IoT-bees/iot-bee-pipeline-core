import Link from "next/link";
import { BrandMark } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-[460px]">
        <div className="flex justify-between items-center mb-10">
          <Link
            href="/"
            className="text-[11px] tracking-[2px] uppercase text-[var(--color-fg-3)] hover:text-[var(--color-accent)] transition-colors"
          >
            ← back to landing
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
