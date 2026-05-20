"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/ui/Panel";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { adminApi } from "@/lib/api/endpoints/admin";

export default function AdminOrgStatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const orgId = Number(id);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "orgs", orgId, "state"],
    queryFn: () => adminApi.orgState(orgId),
    enabled: Number.isFinite(orgId),
  });

  if (isLoading) {
    return (
      <div className="text-[13px] text-[var(--color-fg-3)] font-mono">
        Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-[13px] text-[var(--color-danger)] font-mono">
        {(error as Error).message}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-4 font-mono">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-[var(--color-fg-0)]">
          org · {data.org.name}
        </h2>
        <span className="text-[11px] text-[var(--color-fg-3)] tracking-[1.5px] uppercase">
          slug: {data.org.slug} · id {data.org.id}
        </span>
      </div>

      <Panel>
        <div className="text-[10px] tracking-[1.5px] uppercase text-[var(--color-accent)] mb-2">
          plan
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
          <div>
            plan ·{" "}
            <span className="text-[var(--color-fg-0)]">
              {data.license.plan}
            </span>
          </div>
          <div>
            state ·{" "}
            <span className="text-[var(--color-fg-0)]">
              {data.license.state}
            </span>
          </div>
          <div>
            source ·{" "}
            <span className="text-[var(--color-fg-3)]">
              {data.license.planSource}
            </span>
          </div>
          <div>
            usage ·{" "}
            <span className="text-[var(--color-fg-0)]">
              {data.license.usage.pipelines}
            </span>{" "}
            / {data.license.limits.maxPipelines} pipelines
          </div>
          {data.license.expiresAt && (
            <div>
              expires ·{" "}
              <span className="text-[var(--color-fg-3)]">
                {new Date(data.license.expiresAt).toLocaleString()}
              </span>
            </div>
          )}
          {data.license.stripeSubscriptionStatus && (
            <div>
              stripe ·{" "}
              <span className="text-[var(--color-fg-3)]">
                {data.license.stripeSubscriptionStatus}
              </span>
            </div>
          )}
          {data.license.isRestricted && (
            <div className="col-span-2 text-[var(--color-danger)]">
              restricted (past_due or unpaid)
            </div>
          )}
        </div>
      </Panel>

      <Panel>
        <div className="text-[10px] tracking-[1.5px] uppercase text-[var(--color-accent)] mb-2">
          pipelines ({data.pipelines.length})
        </div>
        {data.pipelines.length === 0 ? (
          <div className="text-[12px] text-[var(--color-fg-3)]">
            No pipelines.
          </div>
        ) : (
          <Table>
            <THead>
              <TH>id</TH>
              <TH>name</TH>
              <TH>status</TH>
            </THead>
            <tbody>
              {data.pipelines.map((p) => (
                <TR key={p.id}>
                  <TD className="font-mono text-[11px] text-[var(--color-fg-3)]">
                    {p.id}
                  </TD>
                  <TD>{p.name}</TD>
                  <TD>
                    <span
                      className={`text-[10px] tracking-[1.5px] uppercase border px-2 py-[2px] rounded-[2px] ${
                        p.status === "active"
                          ? "border-[var(--color-online)] text-[var(--color-online)]"
                          : "border-[#333] text-[var(--color-fg-3)]"
                      }`}
                    >
                      {p.status}
                    </span>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <Panel>
        <div className="text-[10px] tracking-[1.5px] uppercase text-[var(--color-accent)] mb-2">
          recent activity (last 20)
        </div>
        {data.recentAudit.length === 0 ? (
          <div className="text-[12px] text-[var(--color-fg-3)]">
            No recent activity.
          </div>
        ) : (
          <Table>
            <THead>
              <TH>when</TH>
              <TH>action</TH>
              <TH>method</TH>
              <TH>path</TH>
              <TH>user</TH>
              <TH>status</TH>
            </THead>
            <tbody>
              {data.recentAudit.map((e) => (
                <TR key={e.id}>
                  <TD className="font-mono text-[11px] text-[var(--color-fg-3)]">
                    {new Date(e.createdAt).toLocaleString()}
                  </TD>
                  <TD className="font-mono text-[12px]">{e.action}</TD>
                  <TD className="font-mono text-[11px]">{e.method}</TD>
                  <TD className="font-mono text-[11px] text-[var(--color-fg-3)]">
                    {e.path}
                  </TD>
                  <TD className="font-mono text-[11px]">{e.userEmail ?? "—"}</TD>
                  <TD className="font-mono text-[11px]">
                    {e.statusCode ?? "—"}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
