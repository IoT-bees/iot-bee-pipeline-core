import { z } from "zod";

export const pipelineSchema = z.object({
  name: z.string().min(1, "name required"),
  data_source_id: z.number().int().positive("pick a source"),
  validation_schema_id: z.number().int().positive("pick a schema"),
  data_store_id: z.number().int().positive("pick a store"),
  replication: z.number().int().min(1).max(64),
  group_id: z.number().int().positive().optional(),
});

export type PipelineInput = z.infer<typeof pipelineSchema>;
