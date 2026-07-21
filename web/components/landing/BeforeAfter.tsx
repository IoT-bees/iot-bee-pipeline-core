import { Check, X } from "lucide-react";

const before = [
  "Cada instalación se configura de una forma distinta.",
  "Los datos se revisan cuando el cliente ya reportó un problema.",
  "Conexiones, reglas y destinos viven en herramientas separadas.",
  "Confirmar una entrega depende de revisar logs o preguntar al equipo.",
];

const after = [
  "Un proyecto claro por cliente, desde el broker hasta el destino.",
  "Reglas que validan cada dato antes de entregarlo.",
  "Alertas con el evento y el contexto para actuar.",
  "Estado de entrega visible para el equipo y el cliente.",
];

function List({ items, positive }: { items: string[]; positive: boolean }) {
  const Icon = positive ? Check : X;

  return (
    <ul className="mt-5 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[14px] leading-[1.5] text-[var(--color-fg-2)]">
          <Icon
            aria-hidden="true"
            size={18}
            className={positive ? "mt-0.5 shrink-0 text-[var(--color-online)]" : "mt-0.5 shrink-0 text-[var(--color-fg-4)]"}
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function BeforeAfter() {
  return (
    <section className="border-t border-[var(--landing-border)] px-4 py-16 sm:px-6 lg:px-12">
      <div className="mx-auto max-w-[1080px]">
        <div className="text-[12px] font-semibold text-[var(--color-accent-strong)]">OPERACIÓN PARA CRECER</div>
        <h2 className="mt-2 max-w-[680px] text-[28px] font-bold leading-tight text-[var(--color-fg-0)] sm:text-[36px]">
          Más clientes no deberían crear más caos operativo.
        </h2>
        <p className="mt-3 max-w-[640px] text-[15px] leading-[1.6] text-[var(--color-fg-3)]">
          iot bees mantiene la conexión, las reglas y la entrega de cada proyecto bajo el mismo estándar.
        </p>

        <div className="mt-9 grid gap-4 md:grid-cols-2">
          <article className="border border-[var(--landing-border)] bg-[var(--color-bg-panel)] p-6">
            <p className="text-[12px] font-semibold uppercase text-[var(--color-fg-3)]">Antes</p>
            <h3 className="mt-2 text-[20px] font-bold text-[var(--color-fg-0)]">Cada cliente, una excepción</h3>
            <List items={before} positive={false} />
          </article>
          <article className="border border-[var(--color-accent)] bg-[var(--color-bg-panel)] p-6">
            <p className="text-[12px] font-semibold uppercase text-[var(--color-accent-strong)]">Ahora con iot bees</p>
            <h3 className="mt-2 text-[20px] font-bold text-[var(--color-fg-0)]">Una operación que escala</h3>
            <List items={after} positive />
          </article>
        </div>
      </div>
    </section>
  );
}
