import { Router } from "express";
import type { HealthResponse, ReadinessResponse } from "@velaris/shared";

import { env } from "../config/env.js";

export const healthRouter = Router();

healthRouter.get("/health", (_request, response) => {
  const body: HealthResponse = {
    status: "ok",
    app: env.APP_NAME,
    environment: env.NODE_ENV,
    version: process.env.npm_package_version ?? "0.0.0",
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
    timezone: env.APP_TIMEZONE,
  };

  response.json(body);
});

healthRouter.get("/ready", (_request, response) => {
  const body: ReadinessResponse = {
    status: env.DATABASE_URL ? "ready" : "degraded",
    checks: {
      databaseConfiguration: env.DATABASE_URL ? "configured" : "missing",
    },
    timestamp: new Date().toISOString(),
  };

  response.status(env.DATABASE_URL ? 200 : 503).json(body);
});
