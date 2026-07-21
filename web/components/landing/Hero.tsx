import Link from "next/link";

export function Hero() {
  return (
    <section className="px-4 sm:px-6 lg:px-12 pt-16 lg:pt-24 pb-16 lg:pb-20 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,179,0,.06) 2px, rgba(255,179,0,.06) 3px)",
        }}
      />
      <div className="relative mx-auto max-w-[1080px]">
        <div className="max-w-[900px] text-center sm:text-left">
          <h1 className="font-bold text-[42px] sm:text-[62px] leading-[1.08]">
            Convierte instalaciones IoT en servicios que escalan.
          </h1>

          <p className="mt-6 mx-auto sm:mx-0 max-w-[650px] text-[18px] leading-[1.55] text-[var(--color-fg-1)]">
            Conecta el broker del cliente, valida los datos y entrégalos a su sistema.
            Sin construir un backend desde cero para cada instalación.
          </p>

          <div className="flex gap-3 items-center mt-8 justify-center sm:justify-start flex-wrap">
            <Link
              href="/demo"
              className="text-center bg-[var(--color-accent)] text-[var(--landing-accent-ink)] font-bold px-6 py-3 text-[14px] rounded-[2px] hover:bg-[var(--color-accent-dim)] transition-colors"
            >
              VER PROYECTO EN VIVO
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
