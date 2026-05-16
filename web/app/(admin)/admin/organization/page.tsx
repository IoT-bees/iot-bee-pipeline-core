"use client";
import { Panel } from "@/components/ui/Panel";
import { OrgForm } from "@/components/admin/organization/OrgForm";
import { useOrganization } from "@/lib/hooks/useOrganization";

export default function AdminOrganizationPage() {
  const { data, isLoading, error } = useOrganization();
  return (
    <div className="space-y-4">
      <h2 className="text-[18px] font-bold text-[var(--color-fg-0)] font-mono">
        organization
      </h2>
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
