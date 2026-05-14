import { z } from "zod";

export const builderSchema = z.object({
  name: z
    .string()
    .min(1, "name is required")
    .max(32, "max 32 characters"),
  schemaJson: z.string().min(2, "schema cannot be empty"),
});

export type BuilderInput = z.infer<typeof builderSchema>;
