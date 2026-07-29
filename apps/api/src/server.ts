import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { logger } from "./lib/logger.js";
import { healthRouter } from "./routes/health.js";

export function createApp() {
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
  app.use(errorHandler);

  return app;
}
