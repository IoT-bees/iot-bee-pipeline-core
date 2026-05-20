export function Architecture() {
  return (
    <section
      id="arch"
      className="px-4 sm:px-6 lg:px-12 py-16 border-t border-[#1f1f1f]"
    >
      <div className="max-w-[1024px]">
        <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-accent)] mb-2">
          {"// "}architecture
        </div>
        <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-1px] text-[var(--color-fg-0)] mb-3">
          Actor-based, fault isolated, scalable.
        </h2>
        <p className="text-[15px] leading-[1.6] text-[var(--color-fg-2)] max-w-[720px] mb-6">
          Each pipeline is supervised independently. If a single replica
          crashes, only that replica is restarted — the rest keeps streaming.
          Built with <span className="text-[var(--color-accent)]">Actix</span> on Tokio.
        </p>

        <pre className="text-[13px] leading-[1.6] text-[var(--color-fg-2)] overflow-x-auto whitespace-pre bg-[var(--color-bg-panel)] border border-[#1f1f1f] p-5 rounded-[3px] font-mono">
{`SystemActorSupervisor
  └─ PipelineSupervisor                    (one per pipeline)
        ├─ Replica 1: [consumer] → [processor] → [store]
        ├─ Replica 2: [consumer] → [processor] → [store]
        └─ Replica N: [consumer] → [processor] → [store]`}
        </pre>
      </div>
    </section>
  );
}
