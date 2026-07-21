import { ContactForm } from "@/components/admin/contact/ContactForm";
import { Panel } from "@/components/ui/Panel";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStateMessage } from "@/components/admin/AdminStateMessage";
import { getAdminContactSettings } from "@/lib/api/contactServer";

export default async function AdminContactPage() {
  try {
    const settings = await getAdminContactSettings();
    return (
      <div className="space-y-4">
        <AdminPageHeader title="Contacto" description="Define los canales que verán las personas en el sitio público de iot bees. Guarda sólo cuando hayas revisado los datos." />
        <Panel className="max-w-2xl">
          <ContactForm initial={settings} />
        </Panel>
      </div>
    );
  } catch (error) {
    return (
      <AdminStateMessage kind="error" title="No pudimos cargar los datos de contacto" description={error instanceof Error ? error.message : "Vuelve a intentarlo en unos momentos."} />
    );
  }
}
