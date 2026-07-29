import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  app: z.string(),
  environment: z.string(),
  version: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  timestamp: z.string().datetime(),
  timezone: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const readinessResponseSchema = z.object({
  status: z.enum(["ready", "degraded"]),
  checks: z.object({
    databaseConfiguration: z.enum(["configured", "missing"]),
  }),
  timestamp: z.string().datetime(),
});

export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
