import { z } from "zod";

const rabbit = z.object({
  sourceType: z.literal("RABBIT_MQ"),
  url: z.string().min(1, "url required"),
  queue_name: z.string().min(1, "queue name required"),
  consumer_name: z.string().min(1, "consumer name required"),
});

const mqtt = z.object({
  sourceType: z.literal("MQTT"),
  broker_url: z.string().min(1, "broker url required"),
  topic: z.string().min(1, "topic required"),
  client_id: z.string().min(1, "client id required"),
});

const kafka = z.object({
  sourceType: z.literal("KAFKA"),
  brokers: z.string().min(1, "brokers required (comma-separated)"),
  topic: z.string().min(1, "topic required"),
  group_id: z.string().min(1, "group id required"),
});

export const sourceSchema = z.object({
  name: z.string().min(1, "name required").max(30),
  description: z.string().min(1, "description required").max(255),
  config: z.discriminatedUnion("sourceType", [rabbit, mqtt, kafka]),
});

export type SourceInput = z.infer<typeof sourceSchema>;
