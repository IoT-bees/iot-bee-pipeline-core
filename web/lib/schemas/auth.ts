import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("must be a valid email"),
  password: z.string().min(8, "must be at least 8 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = loginSchema.extend({
  name: z.string().min(1, "name is required"),
});
export type RegisterInput = z.infer<typeof registerSchema>;
