import { z } from "zod";

const rabbitConfig = z.object({
  host: z.string().min(1, "host required"),
  queue: z.string().min(1, "queue required"),
});

const mqttConfig = z.object({
  host: z.string().min(1, "host required"),
  topic: z.string().min(1, "topic required"),
});

const kafkaConfig = z.object({
  brokers: z.string().min(1, "brokers required"),
  topic: z.string().min(1, "topic required"),
  group_id: z.string().min(1, "group_id required"),
});

export const sourceSchema = z.discriminatedUnion("sourceType", [
  z.object({
    name: z.string().min(1, "name required"),
    sourceType: z.literal("RABBIT_MQ"),
    config: rabbitConfig,
  }),
  z.object({
    name: z.string().min(1, "name required"),
    sourceType: z.literal("MQTT"),
    config: mqttConfig,
  }),
  z.object({
    name: z.string().min(1, "name required"),
    sourceType: z.literal("KAFKA"),
    config: kafkaConfig,
  }),
]);

export type SourceInput = z.infer<typeof sourceSchema>;
