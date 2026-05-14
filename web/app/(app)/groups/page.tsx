"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { useCreateGroup, useDeleteGroup, useGroups } from "@/lib/hooks/useGroups";
import { groupSchema, type GroupInput } from "@/lib/schemas/group";

export default function GroupsPage() {
  const { data } = useGroups();
  const create = useCreateGroup();
  const del = useDeleteGroup();
  const form = useForm<GroupInput>({ resolver: zodResolver(groupSchema) });
  const list = data ?? [];
  return (
    <div>
      <h1 className="t-title mb-1">pipeline groups</h1>
      <p className="t-mono mb-6">
        {"// "}optional logical containers for pipelines.
      </p>

      <form
        onSubmit={form.handleSubmit(async (v) => {
          await create.mutateAsync(v);
          form.reset({ name: "" });
        })}
        className="flex gap-3 items-end mb-6 max-w-[480px]"
      >
        <FormField
          label="NEW GROUP NAME"
          className="flex-1 mb-0"
          error={form.formState.errors.name?.message}
        >
          <Input {...form.register("name")} />
        </FormField>
        <Button type="submit" variant="primary">
          + CREATE
        </Button>
      </form>

      {list.length === 0 ? (
        <div className="t-mono">{"// "}no groups yet</div>
      ) : (
        <Table>
          <THead>
            <TH>#</TH>
            <TH>NAME</TH>
            <TH className="text-right">ACTIONS</TH>
          </THead>
          <tbody>
            {list.map((g) => (
              <TR key={g.id}>
                <TD>{String(g.id).padStart(2, "0")}</TD>
                <TD>{g.name}</TD>
                <TD className="text-right">
                  <button
                    onClick={() => confirm(`delete ${g.name}?`) && del.mutate(g.id)}
                    className="text-[10px] border border-[var(--color-danger)] text-[var(--color-danger)] px-2 py-1 rounded-[2px]"
                  >
                    delete
                  </button>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
