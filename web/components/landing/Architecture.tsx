export function Architecture() {
  return (
    <section
      id="arch"
      className="px-4 sm:px-6 lg:px-12 py-16 border-t border-[#1f1f1f]"
    >
      <div className="max-w-[1024px]">
        <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-accent)] mb-2">
          {"// "}production core
        </div>
        <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-1px] text-[var(--color-fg-0)] mb-3">
          Built for recurring client projects, not one-off scripts.
        </h2>
        <p className="text-[15px] leading-[1.6] text-[var(--color-fg-2)] max-w-[720px] mb-6">
          Each client pipeline is supervised independently. If a replica
          fails, only that replica is restarted while the rest keeps streaming.
          That gives an integrator one operational surface for many client
          deployments. Built with{" "}
          <span className="text-[var(--color-accent)]">Actix</span> on Tokio.
        </p>

        <pre className="text-[13px] leading-[1.6] text-[var(--color-fg-2)] overflow-x-auto whitespace-pre bg-[var(--color-bg-panel)] border border-[#1f1f1f] p-5 rounded-[3px] font-mono">
{`SystemActorSupervisor
  └─ ClientPipelineSupervisor              (one per client pipeline)
        ├─ Replica 1: [broker] → [payload] → [destination]
        ├─ Replica 2: [broker] → [payload] → [destination]
        └─ Replica N: [broker] → [payload] → [destination]`}
        </pre>
      </div>
    </section>
  );
}
