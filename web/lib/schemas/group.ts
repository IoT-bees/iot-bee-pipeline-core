import { z } from "zod";

export const groupSchema = z.object({
  name: z.string().min(1, "name is required"),
});

export type GroupInput = z.infer<typeof groupSchema>;
