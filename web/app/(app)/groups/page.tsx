"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { DeleteResourceDialog } from "@/components/ui/DeleteResourceDialog";
import { Input } from "@/components/ui/Input";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { useCreateGroup, useDeleteGroup, useGroups } from "@/lib/hooks/useGroups";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import { fmtId } from "@/lib/fmt";
import { groupSchema, type GroupInput } from "@/lib/schemas/group";

export default function GroupsPage() {
  const { data } = useGroups();
  const create = useCreateGroup();
  const del = useDeleteGroup();
  const confirmDelete = useConfirmDelete(del.mutateAsync);
  const form = useForm<GroupInput>({ resolver: zodResolver(groupSchema) });
  const list = data ?? [];
  return (
    <div>
      <h1 className="t-title mb-1">pipeline groups</h1>
      <p className="t-mono mb-6">
        {"// "}logical containers for pipelines (by site, customer, env…).
      </p>

      <div className="mb-6 max-w-[640px]">
        <form
          onSubmit={form.handleSubmit(async (v) => {
            await create.mutateAsync(v);
            form.reset({ name: "", description: "" });
          })}
          className="flex flex-col gap-3"
        >
          <div>
            <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-fg-3)] mb-1.5">
              {"// "}NEW GROUP
            </div>
            <div className="flex gap-3 items-stretch">
              <Input
                {...form.register("name")}
                placeholder="name (e.g. building-a-sensors)"
                className="flex-1"
              />
              <Button type="submit" variant="primary" className="whitespace-nowrap">
                + CREATE
              </Button>
            </div>
            {form.formState.errors.name?.message && (
              <div className="text-[12px] text-[var(--color-danger)] mt-1.5">
                × {form.formState.errors.name.message}
              </div>
            )}
          </div>
          <div>
            <Input
              {...form.register("description")}
              placeholder="description (1-255 chars)"
            />
            {form.formState.errors.description?.message && (
              <div className="text-[12px] text-[var(--color-danger)] mt-1.5">
                × {form.formState.errors.description.message}
              </div>
            )}
          </div>
        </form>
      </div>

      {list.length === 0 ? (
        <div className="t-mono">{"// "}no groups yet</div>
      ) : (
        <Table>
          <THead>
            <TH>#</TH>
            <TH>NAME</TH>
            <TH>DESCRIPTION</TH>
            <TH className="text-right">ACTIONS</TH>
          </THead>
          <tbody>
            {list.map((g) => (
              <TR key={g.id}>
                <TD>{fmtId(g.id)}</TD>
                <TD>{g.name}</TD>
                <TD>{g.description}</TD>
                <TD className="text-right">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => confirmDelete.ask(g.id, g.name)}
                  >
                    delete
                  </Button>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}

      <DeleteResourceDialog
        pending={confirmDelete.pending}
        resourceLabel="pipeline group"
        impact="Pipelines that belong to this group will be left without a container until you reassign them."
        busy={del.isPending}
        error={confirmDelete.error}
        onConfirm={confirmDelete.confirm}
        onClose={confirmDelete.cancel}
      />
    </div>
  );
}
