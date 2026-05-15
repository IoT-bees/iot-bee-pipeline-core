import { z } from "zod";

export const fieldNameSchema = z
  .string()
  .min(1, "field name is required")
  .regex(
    /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    "use letters, digits and underscores; start with a letter or _",
  );

export const schemaNameSchema = z
  .string()
  .min(1, "name is required")
  .max(32, "max 32 characters");
