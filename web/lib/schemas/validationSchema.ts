import { z } from "zod";

export const fieldNameSchema = z
  .string()
  .min(1, "el nombre del campo es obligatorio")
  .regex(
    /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    "usa letras, números y guiones bajos; empieza con una letra o _",
  );

export const schemaNameSchema = z
  .string()
  .min(1, "el nombre es obligatorio")
  .max(32, "máximo 32 caracteres");
