"use client";

export interface ExistingItem {
  id: number;
  name: string;
  summary: string;
}

interface Props {
  items: ReadonlyArray<ExistingItem>;
  preselectId: number | undefined;
  onSelect: (id: number) => void;
}

export function PickExistingList({ items, preselectId, onSelect }: Props) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-[var(--color-fg-3)]">No hay elementos compatibles. Crea uno nuevo para continuar.</p>;
  }
  return (
    <ul className="flex flex-col gap-2" role="radiogroup">
      {items.map((it) => {
        const selected = preselectId === it.id;
        return (
          <li key={it.id}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(it.id)}
              className={`w-full rounded-[4px] border px-3 py-2.5 text-left shadow-sm transition-colors ${
                selected
                  ? "border-[var(--color-accent)] bg-[rgba(255,179,0,0.16)] ring-1 ring-[var(--color-accent)]"
                  : "border-[var(--color-border)] bg-[var(--color-bg-elev)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-base)]"
              }`}
            >
              <div className="text-[12px] text-[var(--color-fg-0)] font-semibold">{it.name}</div>
              <div className="mt-0.5 text-[10px] text-[var(--color-fg-3)]">{it.summary}</div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
