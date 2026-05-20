"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";

const CONFIRM_HEADER_VALUE = "yes-i-am-sure";

export function OrgDeleteButton({
  orgId,
  orgSlug,
  onDeleted,
}: {
  orgId: number | string;
  orgSlug: string;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugMatches = typed === orgSlug;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slugMatches) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/admin/orgs/${orgId}`, {
        method: "DELETE",
        headers: { "X-Confirm": CONFIRM_HEADER_VALUE },
      });
      if (!res.ok && res.status !== 204) {
        const text = await res.text();
        throw new Error(text || `request failed (${res.status})`);
      }
      setOpen(false);
      setTyped("");
      onDeleted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="danger"
        onClick={() => setOpen(true)}
      >
        DELETE ORG (GDPR)
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-[480px]">
      <div className="text-[13px] text-[var(--color-fg-muted)]">
        Esta acción es irreversible. Borra la organización y todos sus
        recursos. Escribe el slug{" "}
        <code className="font-mono">{orgSlug}</code> para confirmar.
      </div>
      <FormField label="slug">
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="font-mono"
          autoFocus
        />
      </FormField>
      {error && (
        <div className="text-[12px] text-[var(--color-danger)]">{error}</div>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setOpen(false);
            setTyped("");
            setError(null);
          }}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="danger"
          disabled={!slugMatches || busy}
        >
          {busy ? "Deleting…" : "Confirm delete"}
        </Button>
      </div>
    </form>
  );
}
