import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import { createAuthServiceFromEnv } from "./auth/auth-dependencies.js";
import { createAuthRouter } from "./auth/auth-router.js";
import type { AuthService } from "./auth/auth-service.js";
import { createUnavailableAuthRouter } from "./auth/unavailable-auth-router.js";
import { errorHandler } from "./middleware/error-handler.js";
import { logger } from "./lib/logger.js";
import { healthRouter } from "./routes/health.js";

export interface AppDependencies {
  authService?: AuthService;
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.use(healthRouter);
  app.use("/api/auth", createAuthRouterIfAvailable(dependencies.authService));
  app.use(errorHandler);

  return app;
}

function createAuthRouterIfAvailable(authService?: AuthService) {
  if (authService) {
    return createAuthRouter(authService);
  }

  try {
    return createAuthRouter(createAuthServiceFromEnv());
  } catch {
    return createUnavailableAuthRouter();
  }
}
