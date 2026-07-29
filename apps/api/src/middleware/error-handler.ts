import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { isAppError } from "../lib/app-error.js";
import { logger } from "../lib/logger.js";

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload.",
        issues: error.issues,
      },
    });
    return;
  }

  if (isAppError(error)) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  logger.error({ error, path: request.path }, "Unhandled API error");
  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error.",
    },
  });
};
