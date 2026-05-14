import { z } from "zod";

const influx = z.object({
  persistenceType: z.literal("INFLUX_DB"),
  url: z.string().min(1, "url required"),
  data_base: z.string().min(1, "database required"),
  measurement: z.string().min(1, "measurement required"),
  token: z.string().min(1, "token required"),
  tag_fields: z.string().optional(),
});

const local = z.object({
  persistenceType: z.literal("LOCAL_LOG"),
  log_name: z.string().min(1, "log name required"),
});

export const storeSchema = z.object({
  name: z.string().min(1, "name required").max(30),
  description: z.string().min(1, "description required").max(255),
  config: z.discriminatedUnion("persistenceType", [influx, local]),
});

export type StoreInput = z.infer<typeof storeSchema>;
