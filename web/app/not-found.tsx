import { ErrorView } from "@/components/error/ErrorView";

export default function NotFound() {
  return (
    <ErrorView
      code="404"
      eyebrow="Página no encontrada"
      title="Esta dirección no está disponible."
      body="Es posible que la página haya cambiado, el enlace sea incorrecto o el recurso ya no exista."
      actions={[{ href: "/", label: "Volver al inicio", primary: true }]}
    />
  );
}
