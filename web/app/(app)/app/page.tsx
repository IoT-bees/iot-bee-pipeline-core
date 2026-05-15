"use client";

import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { PipelineActions } from "@/components/pipelines/PipelineActions";
import { usePipelineStatusAll } from "@/lib/hooks/usePipelineStatusAll";
import { usePipelines } from "@/lib/hooks/usePipelines";
import { useSources } from "@/lib/hooks/useSources";
import { useStores } from "@/lib/hooks/useStores";
import { useSchemas } from "@/lib/hooks/useSchemas";
import { useGroups } from "@/lib/hooks/useGroups";
import { fmtId } from "@/lib/fmt";
import { isDegraded, isHealthy, toPillState } from "@/lib/status";

interface OnboardingStep {
  href: string;
  num: string;
  title: string;
  why: string;
  done: boolean;
}

function OnboardingCard({ step }: { step: OnboardingStep }) {
  return (
    <Link
      href={step.href}
      className={`block border rounded-[3px] p-4 transition-colors ${
        step.done
          ? "border-[var(--color-accent)] bg-[var(--color-bg-panel)]"
          : "border-[#1f1f1f] bg-[var(--color-bg-panel)] hover:border-[var(--color-accent)]"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono font-bold text-[20px] text-[var(--color-accent)]">
          {step.num}
        </span>
        <span
          className={`text-[10px] tracking-[2px] uppercase ${
            step.done
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-fg-4)]"
          }`}
        >
          {step.done ? "✓ done" : "todo"}
        </span>
      </div>
      <div className="font-bold text-[15px] text-[var(--color-fg-0)] mb-1">
        {step.title}
      </div>
      <div className="text-[12px] text-[var(--color-fg-3)] leading-[1.5]">
        {step.why}
      </div>
    </Link>
  );
}

export default function Overview() {
  const { data: status, isPending: statusPending } = usePipelineStatusAll();
  const { data: pipes, isPending: pipesPending } = usePipelines();
  const sourcesQ = useSources();
  const storesQ = useStores();
  const schemasQ = useSchemas();
  const groupsQ = useGroups();

  const isLoading = statusPending || pipesPending;

  const statusByPid = new Map(
    (status ?? []).map((s) => [s.pipeline_id, s.pipeline_general_status]),
  );
  const list = (pipes ?? []).map((p) => ({
    pipeline_id: p.id,
    pipeline_name: p.name,
    pipeline_general_status: statusByPid.get(p.id),
  }));
  const running = list.filter((p) => isHealthy(p.pipeline_general_status))
    .length;
  const errored = list.filter((p) => isDegraded(p.pipeline_general_status))
    .length;
  const total = list.length;

  const sourcesCount = sourcesQ.data?.length ?? 0;
  const storesCount = storesQ.data?.length ?? 0;
  const schemasCount = schemasQ.data?.length ?? 0;
  const groupsCount = groupsQ.data?.length ?? 0;

  const setupReady =
    !sourcesQ.isPending &&
    !storesQ.isPending &&
    !schemasQ.isPending &&
    !groupsQ.isPending &&
    !statusPending;

  const onboarding: OnboardingStep[] = [
    {
      href: "/sources/new",
      num: "01",
      title: "Connect a broker",
      why: "Tell iot-bee where messages come from (RabbitMQ, MQTT or Kafka).",
      done: sourcesCount > 0,
    },
    {
      href: "/schemas/new",
      num: "02",
      title: "Define a schema",
      why: "Describe the fields you expect; bad messages get dropped automatically.",
      done: schemasCount > 0,
    },
    {
      href: "/stores/new",
      num: "03",
      title: "Add a destination",
      why: "InfluxDB or a local log — where validated records will land.",
      done: storesCount > 0,
    },
    {
      href: "/groups",
      num: "04",
      title: "Create a group",
      why: "Logical container so you can organize many pipelines later.",
      done: groupsCount > 0,
    },
    {
      href: "/pipelines/new",
      num: "05",
      title: "Wire & start a pipeline",
      why: "Glue source + schema + store, hit ▸ start, and watch data flow.",
      done: total > 0,
    },
  ];
  const completed = onboarding.filter((s) => s.done).length;
  const onboardingDone = completed === onboarding.length;

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-1 flex-wrap">
        <h1 className="t-title">overview</h1>
        <span className="t-mono">
          {"// "}live status of your iot-bee instance
        </span>
      </div>
      <p className="t-mono mb-6 text-[var(--color-fg-3)]">
        {"// "}press <kbd className="border border-[#333] px-1.5 py-[1px] text-[11px] mx-0.5">⌘K</kbd>
        to jump anywhere or create anything without using the menu.
      </p>

      {setupReady && !onboardingDone && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="t-section">{"// "}setup checklist</h2>
            <span className="text-[12px] text-[var(--color-fg-3)] font-mono">
              {completed} / {onboarding.length} done
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {onboarding.map((step) => (
              <OnboardingCard key={step.num} step={step} />
            ))}
          </div>
        </section>
      )}

      <h2 className="t-section mb-3">{"// "}at a glance</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Panel tone="accent">
          <div className="t-label">{"// "}RUNNING</div>
          <div className="t-title mt-1">
            {running}
            <span className="text-[14px] text-[var(--color-fg-3)] ml-2">
              of {total}
            </span>
          </div>
        </Panel>
        <Panel tone={errored ? "danger" : "default"}>
          <div className="t-label">{"// "}ERRORS / DEGRADED</div>
          <div className="t-title mt-1">{errored}</div>
        </Panel>
        <Panel>
          <div className="t-label">{"// "}TOTAL PIPELINES</div>
          <div className="t-title mt-1">{total}</div>
        </Panel>
        <Panel>
          <div className="t-label">{"// "}RESOURCES</div>
          <div className="text-[13px] font-mono text-[var(--color-fg-2)] mt-1 leading-[1.55]">
            {sourcesCount} sources · {storesCount} stores
            <br />
            {schemasCount} schemas · {groupsCount} groups
          </div>
        </Panel>
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="t-section">{"// "}pipeline status</h2>
        <Link href="/pipelines">
          <Button variant="ghost" size="sm">
            view all pipelines →
          </Button>
        </Link>
      </div>
      {isLoading ? (
        <div className="t-mono">{"// "}loading…</div>
      ) : list.length === 0 ? (
        <Panel className="text-center">
          <div className="t-mono mb-3">{"// "}no pipelines yet</div>
          <Link href="/pipelines/new">
            <Button variant="primary">+ CREATE FIRST PIPELINE</Button>
          </Link>
        </Panel>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <THead>
                <TH>#</TH>
                <TH>NAME</TH>
                <TH>STATE</TH>
                <TH className="text-right">ACTIONS</TH>
              </THead>
              <tbody>
                {list.map((p) => (
                  <TR key={p.pipeline_id}>
                    <TD>{fmtId(p.pipeline_id)}</TD>
                    <TD>
                      <Link
                        href={`/pipelines/${p.pipeline_id}`}
                        className="hover:text-[var(--color-accent)]"
                      >
                        {p.pipeline_name}
                      </Link>
                    </TD>
                    <TD>
                      <Pill state={toPillState(p.pipeline_general_status)}>
                        {(p.pipeline_general_status ?? "STOPPED").toUpperCase()}
                      </Pill>
                    </TD>
                    <TD className="text-right">
                      <div className="flex gap-1.5 justify-end">
                        <PipelineActions
                          id={p.pipeline_id}
                          name={p.pipeline_name}
                          status={p.pipeline_general_status}
                        />
                      </div>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="md:hidden flex flex-col gap-2">
            {list.map((p) => (
              <Panel key={p.pipeline_id}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="t-label">
                      {"// "}#{fmtId(p.pipeline_id)}
                    </div>
                    <Link
                      href={`/pipelines/${p.pipeline_id}`}
                      className="font-bold hover:text-[var(--color-accent)]"
                    >
                      {p.pipeline_name}
                    </Link>
                  </div>
                  <Pill state={toPillState(p.pipeline_general_status)}>
                    {(p.pipeline_general_status ?? "STOPPED").toUpperCase()}
                  </Pill>
                </div>
                <div className="flex gap-2">
                  <PipelineActions
                    id={p.pipeline_id}
                    name={p.pipeline_name}
                    status={p.pipeline_general_status}
                  />
                </div>
              </Panel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
