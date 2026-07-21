import { z } from "zod";

function brokerUrl(message: string) {
  return z.string()
    .trim()
    .min(1, message)
    .refine((value) => {
      if (value === "") return true;
      try {
        const url = new URL(value);
        return Boolean(url.protocol && url.hostname);
      } catch {
        return false;
      }
    }, "Ingresa una URL válida");
}

const rabbit = z.object({
  sourceType: z.literal("RABBIT_MQ"),
  url: brokerUrl("Ingresa la URL de RabbitMQ"),
  queue_name: z.string().min(1, "Ingresa el nombre de la cola"),
  consumer_name: z.string().min(1, "Ingresa el nombre del consumidor"),
});

const mqtt = z.object({
  sourceType: z.literal("MQTT"),
  broker_url: brokerUrl("Ingresa la URL del broker MQTT"),
  topic: z.string().min(1, "Ingresa el tópico"),
  client_id: z.string().min(1, "Ingresa el ID del cliente"),
});

const kafka = z.object({
  sourceType: z.literal("KAFKA"),
  brokers: z.string().min(1, "Ingresa al menos un broker, separado por comas"),
  topic: z.string().min(1, "Ingresa el tópico"),
  group_id: z.string().min(1, "Ingresa el ID del grupo"),
});

export const sourceSchema = z.object({
  name: z.string().trim().min(1, "Ingresa un nombre").min(3, "El nombre debe tener al menos 3 caracteres").max(30, "El nombre admite hasta 30 caracteres"),
  description: z.string().min(1, "Ingresa una descripción").max(255, "La descripción admite hasta 255 caracteres"),
  config: z.discriminatedUnion("sourceType", [rabbit, mqtt, kafka]),
});

export type SourceInput = z.infer<typeof sourceSchema>;
