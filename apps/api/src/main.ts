import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { createApp } from "./server.js";

const app = createApp();

const server = app.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, "Velaris API listening");
});

const shutdown = (signal: NodeJS.Signals) => {
  logger.info({ signal }, "Shutting down API");
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
