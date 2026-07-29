import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { isAppError } from "../lib/app-error.js";
import { logger } from "../lib/logger.js";

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (isJsonParseError(error)) {
    response.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Invalid JSON request body.",
      },
    });
    return;
  }

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

function isJsonParseError(
  error: unknown,
): error is Error & { statusCode: number; type: string } {
  if (!(error instanceof Error)) {
    return false;
  }

  const maybeParseError = error as Error & {
    statusCode?: number;
    type?: string;
  };

  return (
    maybeParseError.statusCode === 400 && maybeParseError.type === "entity.parse.failed"
  );
}
