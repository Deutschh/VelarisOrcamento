import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { createApp } from "./server.js";

const app = createApp();
const port = resolvePort(process.env.PORT);
const host = process.env.HOST ?? "0.0.0.0";

const server = app.listen(port, host, () => {
  logger.info({ host, port }, "Velaris API listening");
});

const shutdown = (signal: NodeJS.Signals) => {
  logger.info({ signal }, "Shutting down API");
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function resolvePort(value: string | undefined) {
  if (!value) {
    return env.API_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer.");
  }

  return port;
}
