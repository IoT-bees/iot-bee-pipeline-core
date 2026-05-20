"use client";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { OrgForm } from "@/components/admin/organization/OrgForm";
import { useOrganization } from "@/lib/hooks/useOrganization";

export default function AdminOrganizationPage() {
  const { data, isLoading, error } = useOrganization();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-[var(--color-fg-0)] font-mono">
          organization
        </h2>
        {data && (
          <Link
            href={`/admin/orgs/${data.id}`}
            className="font-mono text-[12px] tracking-[1.5px] uppercase border border-[#333] text-[var(--color-fg-1)] hover:border-[var(--color-accent)] px-3 py-1.5 rounded-[2px]"
          >
            view real state →
          </Link>
        )}
      </div>
      <Panel>
        {isLoading && (
          <div className="text-[13px] text-[var(--color-fg-3)] font-mono">
            Loading…
          </div>
        )}
        {error && (
          <div className="text-[13px] text-[var(--color-danger)] font-mono">
            {(error as Error).message}
          </div>
        )}
        {data && <OrgForm initial={data} />}
      </Panel>
    </div>
  );
}
