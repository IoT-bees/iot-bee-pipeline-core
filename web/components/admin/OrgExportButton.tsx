"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function OrgExportButton({ orgId }: { orgId: number | string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/admin/orgs/${orgId}/export`, {
        method: "GET",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `request failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `org-${orgId}-export.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "download failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        onClick={download}
        disabled={busy}
      >
        {busy ? "Preparing…" : "DOWNLOAD EXPORT (GDPR)"}
      </Button>
      {error && (
        <div className="text-[12px] text-[var(--color-danger)]">{error}</div>
      )}
    </div>
  );
}
