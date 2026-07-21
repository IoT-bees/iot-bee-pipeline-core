import { z } from "zod";

export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Ingresa un nombre para el grupo.")
    .max(30, "El nombre no puede superar los 30 caracteres."),
  description: z
    .string()
    .trim()
    .min(1, "Describe el propósito del grupo.")
    .max(255, "El propósito no puede superar los 255 caracteres."),
});

export type GroupInput = z.infer<typeof groupSchema>;
