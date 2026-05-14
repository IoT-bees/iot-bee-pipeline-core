"use client";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { DeleteResourceDialog } from "@/components/ui/DeleteResourceDialog";
import { Panel } from "@/components/ui/Panel";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { useDeleteSource, useSources } from "@/lib/hooks/useSources";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import { fmtId } from "@/lib/fmt";

export default function SourcesPage() {
  const { data, isLoading } = useSources();
  const del = useDeleteSource();
  const confirmDelete = useConfirmDelete(del.mutateAsync);
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
                <TH>DESCRIPTION</TH>
                <TH className="text-right">ACTIONS</TH>
              </THead>
              <tbody>
                {list.map((s) => (
                  <TR key={s.id}>
                    <TD>{fmtId(s.id)}</TD>
                    <TD>{s.name}</TD>
                    <TD>{s.sourceType}</TD>
                    <TD>{s.dataSourceDescription}</TD>
                    <TD className="text-right">
                      <div className="flex gap-1.5 justify-end">
                        <Link href={`/sources/${s.id}/edit`}>
                          <Button variant="ghost" size="sm">edit</Button>
                        </Link>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => confirmDelete.ask(s.id, s.name)}
                        >
                          delete
                        </Button>
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
                    <div className="t-label">{"// "}#{fmtId(s.id)}</div>
                    <div className="font-bold">{s.name}</div>
                    <div className="t-mono">{s.sourceType}</div>
                    <div className="text-[12px] text-[var(--color-fg-3)] mt-1">
                      {s.dataSourceDescription}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/sources/${s.id}/edit`}>
                    <Button variant="ghost" size="sm">edit</Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => confirmDelete.ask(s.id, s.name)}
                  >
                    delete
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
        </>
      )}

      <DeleteResourceDialog
        pending={confirmDelete.pending}
        resourceLabel="data source"
        impact="Pipelines that reference this source will lose their connection and stop processing."
        busy={del.isPending}
        error={confirmDelete.error}
        onConfirm={confirmDelete.confirm}
        onClose={confirmDelete.cancel}
      />
    </div>
  );
}
