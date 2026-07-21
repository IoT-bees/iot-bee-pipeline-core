export type ReplicaErrorDescription = {
  title: string;
  description: string;
  recommendation: string;
};

export function describeReplicaError(
  error?: string | null,
): ReplicaErrorDescription {
  const normalized = (error ?? "").toLowerCase();

  if (
    normalized.includes("failed to lookup address information") ||
    normalized.includes("name or service not known")
  ) {
    return {
      title: "No se encontró el servidor de la fuente de datos",
      description:
        "La réplica no puede conectarse porque el nombre o la dirección configurados no se resuelven.",
      recommendation:
        "Verifica la dirección del servidor y el puerto de la fuente de datos, y confirma que el servidor pueda resolver ese nombre mediante DNS.",
    };
  }

  return {
    title: "Una réplica requiere atención",
    description:
      "La réplica no puede procesar datos correctamente en este momento.",
    recommendation:
      "Verifica la configuración y la disponibilidad de la fuente de datos antes de reanudar la operación.",
  };
}
