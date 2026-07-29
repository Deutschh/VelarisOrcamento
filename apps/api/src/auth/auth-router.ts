import { Router } from "express";
import type { Request } from "express";
import {
  loginRequestSchema,
  refreshRequestSchema,
  registerCompanyRequestSchema,
  registerCustomerRequestSchema,
} from "@velaris/shared";

import { asyncHandler } from "../lib/async-handler.js";
import { AppError } from "../lib/app-error.js";
import {
  clearAuthCookies,
  getRefreshTokenFromCookies,
  setAuthCookies,
} from "./auth-cookies.js";
import type { AuthService } from "./auth-service.js";
import type { RequestContext } from "./auth-service.js";

export function createAuthRouter(authService: AuthService) {
  const router = Router();

  router.post(
    "/register/customer",
    asyncHandler(async (request, response) => {
      const body = registerCustomerRequestSchema.parse(request.body);
      const session = await authService.registerCustomer(
        body,
        getRequestContext(request),
      );

      setAuthCookies(response, session);
      response.status(201).json({ user: session.user });
    }),
  );

  router.post(
    "/register/company",
    asyncHandler(async (request, response) => {
      const body = registerCompanyRequestSchema.parse(request.body);
      const session = await authService.registerCompany(body, getRequestContext(request));

      setAuthCookies(response, session);
      response.status(201).json({ user: session.user, companyId: session.companyId });
    }),
  );

  router.post(
    "/login",
    asyncHandler(async (request, response) => {
      const body = loginRequestSchema.parse(request.body);
      const session = await authService.login(body, getRequestContext(request));

      setAuthCookies(response, session);
      response.json({ user: session.user });
    }),
  );

  router.post(
    "/refresh",
    asyncHandler(async (request, response) => {
      const body = refreshRequestSchema.parse(request.body);
      const refreshToken =
        body.refreshToken ?? getRefreshTokenFromCookies(request.cookies);

      if (!refreshToken) {
        throw new AppError("Refresh token is required.", 400, "REFRESH_TOKEN_REQUIRED");
      }

      const session = await authService.refresh(refreshToken, getRequestContext(request));

      setAuthCookies(response, session);
      response.json({ user: session.user });
    }),
  );

  router.post(
    "/logout",
    asyncHandler(async (request, response) => {
      const refreshToken = getRefreshTokenFromCookies(request.cookies);
      await authService.logout(refreshToken);
      clearAuthCookies(response);
      response.status(204).send();
    }),
  );

  router.post("/verify-email", (_request, response) => {
    response.status(501).json({
      error: {
        code: "EMAIL_VERIFICATION_PROVIDER_PENDING",
        message: "Email verification will be enabled when the email adapter is selected.",
      },
    });
  });

  router.post("/forgot-password", (_request, response) => {
    response.status(501).json({
      error: {
        code: "EMAIL_PROVIDER_PENDING",
        message: "Password recovery will be enabled when the email adapter is selected.",
      },
    });
  });

  router.post("/reset-password", (_request, response) => {
    response.status(501).json({
      error: {
        code: "EMAIL_PROVIDER_PENDING",
        message: "Password reset will be enabled when the email adapter is selected.",
      },
    });
  });

  return router;
}

function getRequestContext(request: Request): RequestContext {
  const userAgent = request.get("user-agent");

  return {
    ...(userAgent ? { userAgent } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
  };
}
