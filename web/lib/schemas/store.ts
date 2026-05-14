import { z } from "zod";

export const storeSchema = z.discriminatedUnion("persistenceType", [
  z.object({
    name: z.string().min(1, "name required"),
    persistenceType: z.literal("INFLUX_DB"),
    host: z.string().min(1, "host required"),
    database: z.string().min(1, "database required"),
    measurement: z.string().min(1, "measurement required"),
    tag_fields: z.array(z.string()).optional(),
  }),
  z.object({
    name: z.string().min(1, "name required"),
    persistenceType: z.literal("LOCAL_LOG"),
    log_name: z.string().min(1, "log_name required"),
  }),
]);

export type StoreInput = z.infer<typeof storeSchema>;
