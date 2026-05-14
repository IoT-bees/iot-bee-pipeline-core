export function Footer({ apiUrl }: { apiUrl: string }) {
  return (
    <div className="bg-[#050505] border-t border-[#1a1a1a] px-5 py-2.5 flex justify-between text-[11px] tracking-[1.5px] text-[var(--color-fg-4)] font-mono">
      <span>● connected · api {apiUrl}</span>
      <span>
        <span className="text-[var(--color-accent)]">▲</span> system: healthy
      </span>
    </div>
  );
}
