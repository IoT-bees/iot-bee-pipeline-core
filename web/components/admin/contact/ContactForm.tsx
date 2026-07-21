"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { useUpdateContactSettings } from "@/lib/hooks/useContactSettings";
import type { ContactSettings } from "@/lib/api/types";

export function ContactForm({ initial }: { initial: ContactSettings }) {
  const [contactEmail, setContactEmail] = useState(initial.contactEmail);
  const [whatsappNumber, setWhatsappNumber] = useState(initial.whatsappNumber ?? "");
  const update = useUpdateContactSettings();

  useEffect(() => {
    setContactEmail(initial.contactEmail);
    setWhatsappNumber(initial.whatsappNumber ?? "");
  }, [initial.contactEmail, initial.whatsappNumber]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    update.mutate(
      {
        contactEmail,
        whatsappNumber: whatsappNumber.trim() || null,
      },
      {
        onSuccess: (settings) => {
          setContactEmail(settings.contactEmail);
          setWhatsappNumber(settings.whatsappNumber ?? "");
        },
      },
    );
  }

  const dirty =
    contactEmail !== initial.contactEmail ||
    whatsappNumber !== (initial.whatsappNumber ?? "");

  return (
    <form onSubmit={submit} className="max-w-[480px] space-y-4">
      <FormField label="correo de contacto" hint="Se usará en el enlace de contacto del sitio público.">
        <Input
          type="email"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          required
          autoComplete="email"
        />
      </FormField>
      <FormField label="número de WhatsApp" hint="Incluye el prefijo internacional. Déjalo vacío para ocultar WhatsApp.">
        <Input
          type="tel"
          value={whatsappNumber}
          onChange={(event) => setWhatsappNumber(event.target.value)}
          placeholder="+57 300 123 4567"
          autoComplete="tel"
        />
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={!dirty || update.isPending}>
          {update.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
