import { z } from "zod";
import type { ResponseValidator } from "./request";

const userSchema = z.object({
  id: z.number(),
  organizationId: z.number(),
  email: z.string().email(),
  name: z.string(),
  role: z.string(),
  status: z.string(),
});

export const authResponseSchema = z.object({ user: userSchema, token: z.string().min(1) });
export const meResponseSchema = z.object({ user: userSchema });
export const hasUsersResponseSchema = z.object({ has_users: z.boolean() });
export const loginRequestSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(1_024),
});
export const registerRequestSchema = loginRequestSchema.extend({
  name: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(1_024),
});
export const stripeCheckoutRequestSchema = z.object({ planId: z.string().trim().min(1).max(100) });
export const stripeActivationRequestSchema = z.object({ sessionId: z.string().trim().min(1).max(255) });

const timestamp = z.string();
export const rawDataSourceSchema = z.object({
  id: z.number(),
  name: z.string(),
  sourceType: z.enum(["RABBIT_MQ", "MQTT", "KAFKA"]),
  dataSourceConfiguration: z.string(),
  dataSourceDescription: z.string(),
  createdAt: timestamp.optional(),
  updatedAt: timestamp.optional(),
});

export const rawDataStoreSchema = z.object({
  id: z.number(),
  name: z.string(),
  storeType: z.enum(["INFLUX_DB", "LOCAL_LOG", "WEBHOOK"]),
  dataStoreConfiguration: z.string(),
  dataStoreDescription: z.string(),
  createdAt: timestamp.optional(),
  updatedAt: timestamp.optional(),
});

export const rawValidationSchemaSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  schema: z.string(),
  createdAt: timestamp.optional(),
  updatedAt: timestamp.optional(),
});

export function validated<T>(schema: z.ZodType<T>): ResponseValidator<T> {
  return (value) => schema.parse(value);
}
