"use client";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { useDeleteSource, useSources } from "@/lib/hooks/useSources";

export default function SourcesPage() {
  const { data, isLoading } = useSources();
  const del = useDeleteSource();
  const list = data ?? [];
  return (
    <div>
      <h1 className="t-title mb-1">data sources</h1>
      <p className="t-mono mb-4">
        {"// "}message-broker connections that feed pipelines.
      </p>
      <div className="flex gap-3 items-center mb-4">
        <Link href="/sources/new">
          <Button variant="primary">+ NEW SOURCE</Button>
        </Link>
      </div>
      {isLoading ? (
        <div className="t-mono">{"// "}loading…</div>
      ) : list.length === 0 ? (
        <div className="t-mono">{"// "}no data sources yet</div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <THead>
                <TH>#</TH>
                <TH>NAME</TH>
                <TH>TYPE</TH>
                <TH className="text-right">ACTIONS</TH>
              </THead>
              <tbody>
                {list.map((s) => (
                  <TR key={s.id}>
                    <TD>{String(s.id).padStart(2, "0")}</TD>
                    <TD>{s.name}</TD>
                    <TD>{s.sourceType}</TD>
                    <TD className="text-right">
                      <div className="flex gap-1.5 justify-end">
                        <Link href={`/sources/${s.id}/edit`}>
                          <span className="inline-block text-[10px] border border-[#333] text-[var(--color-fg-1)] px-2 py-1 rounded-[2px]">
                            edit
                          </span>
                        </Link>
                        <button
                          onClick={() => confirm(`delete ${s.name}?`) && del.mutate(s.id)}
                          className="text-[10px] border border-[var(--color-danger)] text-[var(--color-danger)] px-2 py-1 rounded-[2px]"
                        >
                          delete
                        </button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="md:hidden flex flex-col gap-2">
            {list.map((s) => (
              <Panel key={s.id}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="t-label">{"// "}#{String(s.id).padStart(2, "0")}</div>
                    <div className="font-bold">{s.name}</div>
                    <div className="t-mono">{s.sourceType}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/sources/${s.id}/edit`}>
                    <span className="inline-block text-[10px] border border-[#333] text-[var(--color-fg-1)] px-2 py-1 rounded-[2px]">
                      edit
                    </span>
                  </Link>
                  <button
                    onClick={() => confirm(`delete ${s.name}?`) && del.mutate(s.id)}
                    className="text-[10px] border border-[var(--color-danger)] text-[var(--color-danger)] px-2 py-1 rounded-[2px]"
                  >
                    delete
                  </button>
                </div>
              </Panel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
