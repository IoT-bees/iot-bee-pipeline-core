export function Architecture() {
  return (
    <section
      id="arch"
      className="px-4 sm:px-6 lg:px-12 py-16 border-t border-[#1f1f1f]"
    >
      <h2 className="t-section mb-6">{"// "}architecture</h2>
      <p className="t-body max-w-[640px] mb-6">
        a top-level supervisor tracks one supervisor per pipeline. each pipeline
        spawns N replicas, each replica is a chain of three actors: consumer →
        processor → store.
      </p>
      <pre className="text-[11px] text-[var(--color-fg-2)] leading-snug overflow-x-auto whitespace-pre">
{`SystemActorSupervisor
  └─ PipelineSupervisor (per pipeline)
        ├─ Replica 1: [consumer] → [processor] → [store]
        ├─ Replica 2: [consumer] → [processor] → [store]
        └─ Replica N: [consumer] → [processor] → [store]`}
      </pre>
    </section>
  );
}
