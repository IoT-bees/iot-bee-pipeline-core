"use client";

import { ErrorView } from "@/components/error/ErrorView";

export default function Error() {
  return (
    <ErrorView
      code="500"
      eyebrow="Error del sistema"
      title="No pudimos mostrar esta vista."
      body="Ocurrió un problema al cargar la información. Puedes intentarlo de nuevo o volver al inicio."
      actions={[{ href: "/", label: "Volver al inicio", primary: true }]}
    />
  );
}
