import { z } from "zod";

export const groupSchema = z.object({
  name: z.string().min(1, "name required").max(30),
  description: z.string().min(1, "description required").max(255),
});

export type GroupInput = z.infer<typeof groupSchema>;
