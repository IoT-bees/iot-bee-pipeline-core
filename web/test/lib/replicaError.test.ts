import { describe, expect, it } from "vitest";
import { describeReplicaError } from "@/lib/replicaError";

describe("describeReplicaError", () => {
  it("explains DNS resolution failures in Spanish with an actionable recommendation", () => {
    expect(
      describeReplicaError(
        "consumer: Data source error: Data source connection failed: IO error: failed to lookup address information: Name or service not known",
      ),
    ).toEqual({
      title: "No se encontró el servidor de la fuente de datos",
      description:
        "La réplica no puede conectarse porque el nombre o la dirección configurados no se resuelven.",
      recommendation:
        "Verifica la dirección del servidor y el puerto de la fuente de datos, y confirma que el servidor pueda resolver ese nombre mediante DNS.",
    });
  });

  it("uses a Spanish fallback for unknown errors", () => {
    expect(describeReplicaError()).toEqual({
      title: "Una réplica requiere atención",
      description:
        "La réplica no puede procesar datos correctamente en este momento.",
      recommendation:
        "Verifica la configuración y la disponibilidad de la fuente de datos antes de reanudar la operación.",
    });
  });
});
