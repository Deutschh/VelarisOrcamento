import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { pinoHttp } from "pino-http";

import { createAdminRouter } from "./admin/admin-router.js";
import type { AdminService } from "./admin/admin-service.js";
import { createAuthRouter } from "./auth/auth-router.js";
import type { AuthService } from "./auth/auth-service.js";
import type { TokenService } from "./auth/token-service.js";
import { createUnavailableAuthRouter } from "./auth/unavailable-auth-router.js";
import { createCompanyRouter } from "./company/company-router.js";
import type { CompanyAccountService } from "./company/company-account-service.js";
import { env } from "./config/env.js";
import { authenticate } from "./middleware/authenticate.js";
import { authorizeAdmin } from "./middleware/authorize-admin.js";
import { errorHandler } from "./middleware/error-handler.js";
import { logger } from "./lib/logger.js";
import { healthRouter } from "./routes/health.js";
import { createRuntimeDependenciesFromEnv } from "./runtime-dependencies.js";

export interface AppDependencies {
  authService?: AuthService;
  tokenService?: TokenService;
  adminService?: AdminService;
  companyAccountService?: CompanyAccountService;
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();
  const runtimeDependencies = resolveRuntimeDependencies(dependencies);

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
  app.use("/api/auth", createAuthRouterIfAvailable(runtimeDependencies.authService));
  app.use("/api/admin", createProtectedAdminRouterIfAvailable(runtimeDependencies));
  app.use("/api/company", createProtectedCompanyRouterIfAvailable(runtimeDependencies));
  app.use(errorHandler);

  return app;
}

function resolveRuntimeDependencies(dependencies: AppDependencies): AppDependencies {
  if (
    dependencies.authService ||
    dependencies.tokenService ||
    dependencies.adminService ||
    dependencies.companyAccountService
  ) {
    return dependencies;
  }

  try {
    return createRuntimeDependenciesFromEnv();
  } catch {
    return {};
  }
}

function createAuthRouterIfAvailable(authService?: AuthService) {
  return authService ? createAuthRouter(authService) : createUnavailableAuthRouter();
}

function createProtectedAdminRouterIfAvailable(dependencies: AppDependencies) {
  if (dependencies.tokenService && dependencies.adminService) {
    return [
      authenticate(dependencies.tokenService),
      authorizeAdmin,
      createAdminRouter(dependencies.adminService),
    ];
  }

  return createUnavailableAuthRouter();
}

function createProtectedCompanyRouterIfAvailable(dependencies: AppDependencies) {
  if (dependencies.tokenService && dependencies.companyAccountService) {
    return [
      authenticate(dependencies.tokenService),
      createCompanyRouter(dependencies.companyAccountService),
    ];
  }

  return createUnavailableAuthRouter();
}
