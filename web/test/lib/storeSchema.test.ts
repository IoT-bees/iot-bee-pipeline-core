import { describe, expect, it } from "vitest";

import { storeSchema } from "@/lib/schemas/store";

describe("storeSchema", () => {
  const webhook = {
    persistenceType: "WEBHOOK" as const,
    url: "https://cliente.ejemplo.com/iot/eventos",
    bearer_token: "token-seguro",
  };

  it("accepts a valid webhook endpoint and optional bearer token", () => {
    expect(storeSchema.safeParse({
      name: "webhook-produccion",
      description: "Entrega de eventos validados al cliente",
      config: webhook,
    }).success).toBe(true);
  });

  it("requires meaningful names, descriptions, endpoints and tokens", () => {
    const result = storeSchema.safeParse({
      name: "io",
      description: "Corta",
      config: {
        ...webhook,
        url: "cliente.ejemplo.com/eventos",
        bearer_token: "corto",
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(expect.arrayContaining([
        "El nombre debe tener al menos 3 caracteres",
        "La descripción debe tener al menos 10 caracteres",
        "Introduce una URL HTTP o HTTPS válida",
        "El token debe tener al menos 8 caracteres",
      ]));
    }
  });

  it("muestra solo el requisito al dejar vacío el endpoint", () => {
    const result = storeSchema.safeParse({
      name: "webhook-produccion",
      description: "Entrega de eventos validados al cliente",
      config: { ...webhook, url: "" },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Ingresa la URL del endpoint");
      expect(messages).not.toContain("Introduce una URL HTTP o HTTPS válida");
    }
  });
});
