import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { OrgForm } from "@/components/admin/organization/OrgForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStateMessage } from "@/components/admin/AdminStateMessage";
import { getAdminOrganization } from "@/lib/api/adminServer";

export default async function AdminOrganizationPage() {
  try {
    const organization = await getAdminOrganization();
    return (
      <div className="space-y-4">
        <AdminPageHeader
          title="Organización"
          description="Actualiza el nombre y el identificador público de esta organización. El slug se usa en enlaces y debe mantenerse estable."
          action={<Link
            href={`/admin/orgs/${organization.id}`}
            className="inline-flex min-h-10 items-center font-mono text-[13px] border border-[var(--color-border-strong)] text-[var(--color-fg-1)] hover:border-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] px-3 rounded-[2px]"
          >
            Ver estado de la organización →
          </Link>}
          meta={`ID ${organization.id} · Creada el ${new Date(organization.createdAt).toLocaleDateString("es-CO")}`}
        />
        <Panel className="max-w-2xl">
          <OrgForm initial={organization} />
        </Panel>
      </div>
    );
  } catch (error) {
    return (
      <AdminStateMessage kind="error" title="No pudimos cargar la organización" description={error instanceof Error ? error.message : "Vuelve a intentarlo en unos momentos."} />
    );
  }
}
