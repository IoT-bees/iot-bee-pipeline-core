"use client";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { DeleteResourceDialog } from "@/components/ui/DeleteResourceDialog";
import { Panel } from "@/components/ui/Panel";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { useDeleteSchema, useSchemas } from "@/lib/hooks/useSchemas";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import { fmtId } from "@/lib/fmt";

export default function SchemasPage() {
  const { data, isLoading } = useSchemas();
  const del = useDeleteSchema();
  const confirmDelete = useConfirmDelete(del.mutateAsync);
  const list = data ?? [];
  return (
    <div>
      <h1 className="t-title mb-1">validation schemas</h1>
      <p className="t-mono mb-4">
        {"// "}field-level validation and arithmetic transforms.
      </p>
      <div className="flex gap-3 items-center mb-4">
        <Link href="/schemas/new">
          <Button variant="primary">+ NEW SCHEMA</Button>
        </Link>
      </div>
      {isLoading ? (
        <div className="t-mono">{"// "}loading…</div>
      ) : list.length === 0 ? (
        <div className="t-mono">{"// "}no schemas yet</div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <THead>
                <TH>#</TH>
                <TH>NAME</TH>
                <TH>FIELDS</TH>
                <TH className="text-right">ACTIONS</TH>
              </THead>
              <tbody>
                {list.map((s) => (
                  <TR key={s.id}>
                    <TD>{fmtId(s.id)}</TD>
                    <TD>{s.name}</TD>
                    <TD>{Object.keys(s.schema ?? {}).length}</TD>
                    <TD className="text-right">
                      <div className="flex gap-1.5 justify-end">
                        <Link href={`/schemas/${s.id}`}>
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
                    <div className="t-mono">{Object.keys(s.schema ?? {}).length} fields</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/schemas/${s.id}`}>
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
        resourceLabel="validation schema"
        impact="Pipelines that use this schema will fail validation on every message until you assign them a new schema."
        busy={del.isPending}
        error={confirmDelete.error}
        onConfirm={confirmDelete.confirm}
        onClose={confirmDelete.cancel}
      />
    </div>
  );
}
