import type { RequestHandler } from "express";

import { AdminAccessDeniedError } from "../admin/admin-errors.js";
import { AppError } from "../lib/app-error.js";

export const authorizeAdmin: RequestHandler = (request, _response, next) => {
  if (!request.auth) {
    next(new AppError("Authentication required.", 401, "AUTHENTICATION_REQUIRED"));
    return;
  }

  if (request.auth.role !== "admin") {
    next(new AdminAccessDeniedError());
    return;
  }

  next();
};
