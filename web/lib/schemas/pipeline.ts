import { z } from "zod";

export const pipelineSchema = z.object({
  name: z.string().min(1, "name required").max(30),
  description: z.string().min(1, "description required").max(255),
  dataSourceId: z.number().int().positive("pick a source"),
  validationSchemaId: z.number().int().positive("pick a schema"),
  dataStoreId: z.number().int().positive("pick a store"),
  pipelineGroupId: z.number().int().positive("pick a group"),
  pipelineReplication: z.number().int().min(1).max(64),
});

export type PipelineInput = z.infer<typeof pipelineSchema>;
