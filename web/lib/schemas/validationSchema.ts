import { z } from "zod";

const operatorEnum = z.enum(["Add", "Subtract", "Multiply", "Divide"]);
const fieldTypeEnum = z.enum(["float", "int", "bool", "string"]);

const operationSchema = z.object({
  operator: operatorEnum,
  operand: z.number(),
});

export const fieldSchema = z.object({
  name: z.string().min(1, "name is required"),
  field_type: fieldTypeEnum,
  required: z.boolean(),
  default: z.union([z.number(), z.boolean(), z.string()]).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  operations: z.array(operationSchema).default([]),
});

export const builderSchema = z.object({
  name: z.string().min(1, "name is required"),
  schema: z.object({
    fields: z.array(fieldSchema).min(1, "at least one field"),
  }),
});

export type BuilderInput = z.infer<typeof builderSchema>;
