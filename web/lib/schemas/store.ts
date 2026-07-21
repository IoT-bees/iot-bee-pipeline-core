import { z } from "zod";

function httpUrl(message: string) {
  return z.string()
    .trim()
    .min(1, message)
    .refine((value) => {
      if (value === "") return true;
      try {
        const url = new URL(value);
        return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
      } catch {
        return false;
      }
    }, "Introduce una URL HTTP o HTTPS válida");
}

const token = z.string()
  .trim()
  .min(1, "El token es obligatorio")
  .min(8, "El token debe tener al menos 8 caracteres");

const optionalToken = z.string()
  .trim()
  .refine((value) => value.length === 0 || value.length >= 8, "El token debe tener al menos 8 caracteres");

const influx = z.object({
  persistenceType: z.literal("INFLUX_DB"),
  url: z.string().min(1, "La URL es obligatoria"),
  data_base: z.string().min(1, "La base de datos es obligatoria"),
  measurement: z.string().min(1, "La medición es obligatoria"),
  token,
  tag_fields: z.string().optional(),
});

const local = z.object({
  persistenceType: z.literal("LOCAL_LOG"),
  log_name: z.string().min(1, "El nombre del registro es obligatorio"),
});

const webhook = z.object({
  persistenceType: z.literal("WEBHOOK"),
  url: httpUrl("Ingresa la URL del endpoint"),
  bearer_token: optionalToken.optional(),
});

export const storeSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").min(3, "El nombre debe tener al menos 3 caracteres").max(30, "Máximo 30 caracteres"),
  description: z.string().trim().min(1, "La descripción es obligatoria").min(10, "La descripción debe tener al menos 10 caracteres").max(255, "Máximo 255 caracteres"),
  config: z.discriminatedUnion("persistenceType", [influx, local, webhook]),
});

export type StoreInput = z.infer<typeof storeSchema>;
