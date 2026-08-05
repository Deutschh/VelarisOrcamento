import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { pinoHttp } from "pino-http";

import type { AppEnv } from "@velaris/shared";
import { createAdminRouter } from "./admin/admin-router.js";
import type { AdminService } from "./admin/admin-service.js";
import { createAuthRouter } from "./auth/auth-router.js";
import type { AuthService } from "./auth/auth-service.js";
import type { TokenService } from "./auth/token-service.js";
import { createUnavailableAuthRouter } from "./auth/unavailable-auth-router.js";
import { createCompanyRouter } from "./company/company-router.js";
import type { CompanyAccountService } from "./company/company-account-service.js";
import type { CompanyAppointmentService } from "./company/company-appointment-service.js";
import type { CompanyProposalService } from "./company/company-proposal-service.js";
import type { CompanyQuoteRequestService } from "./company/company-quote-request-service.js";
import { env } from "./config/env.js";
import { createCustomerRouter } from "./customer/customer-router.js";
import type { CustomerService } from "./customer/customer-service.js";
import { authenticate } from "./middleware/authenticate.js";
import { authorizeAdmin } from "./middleware/authorize-admin.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createRateLimitMiddleware } from "./middleware/rate-limit.js";
import { noStoreApiResponses, securityHeaders } from "./middleware/security-headers.js";
import { logger } from "./lib/logger.js";
import type { OperationalMetricsService } from "./operational/operational-metrics-service.js";
import { createPublicRouter } from "./public/public-router.js";
import type { PublicCompanyService } from "./public/public-service.js";
import type { PublicQuoteRequestService } from "./public/public-quote-request-service.js";
import { createUnavailablePublicRouter } from "./public/unavailable-public-router.js";
import { healthRouter } from "./routes/health.js";
import { createRuntimeDependenciesFromEnv } from "./runtime-dependencies.js";
import type { TemplateAdminService } from "./templates/template-service.js";

export interface AppDependencies {
  authService?: AuthService;
  tokenService?: TokenService;
  adminService?: AdminService;
  companyAccountService?: CompanyAccountService;
  companyQuoteRequestService?: CompanyQuoteRequestService;
  companyProposalService?: CompanyProposalService;
  companyAppointmentService?: CompanyAppointmentService;
  publicCompanyService?: PublicCompanyService;
  publicQuoteRequestService?: PublicQuoteRequestService;
  templateAdminService?: TemplateAdminService;
  customerService?: CustomerService;
  operationalMetricsService?: OperationalMetricsService;
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();
  const runtimeDependencies = resolveRuntimeDependencies(dependencies);
  const corsAllowedOrigins = resolveCorsAllowedOrigins(env);

  app.disable("x-powered-by");
  if (env.TRUST_PROXY) {
    app.set("trust proxy", 1);
  }
  app.use(
    securityHeaders({
      hstsEnabled:
        env.SECURITY_HSTS_ENABLED ?? !["development", "test"].includes(env.NODE_ENV),
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || corsAllowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(noStoreApiResponses());
  app.use(pinoHttp({ logger }));
  app.use(
    createRateLimitMiddleware({
      enabled: env.RATE_LIMIT_ENABLED,
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
      skip: (request) => request.path === "/health",
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.use(healthRouter);
  app.use("/api/public", createPublicRouterIfAvailable(runtimeDependencies));
  app.use(
    "/api/auth",
    createRateLimitMiddleware({
      enabled: env.RATE_LIMIT_ENABLED,
      windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
      maxRequests: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
    }),
    createAuthRouterIfAvailable(runtimeDependencies.authService),
  );
  app.use("/api/admin", createProtectedAdminRouterIfAvailable(runtimeDependencies));
  app.use("/api/company", createProtectedCompanyRouterIfAvailable(runtimeDependencies));
  app.use("/api/customer", createProtectedCustomerRouterIfAvailable(runtimeDependencies));
  app.use(errorHandler);

  return app;
}

export function resolveCorsAllowedOrigins(
  config: Pick<AppEnv, "CORS_ORIGIN" | "CORS_ORIGINS">,
) {
  const configuredValue = config.CORS_ORIGINS ?? config.CORS_ORIGIN;

  return new Set(
    configuredValue
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function resolveRuntimeDependencies(dependencies: AppDependencies): AppDependencies {
  if (
    dependencies.authService ||
    dependencies.tokenService ||
    dependencies.adminService ||
    dependencies.companyAccountService ||
    dependencies.companyQuoteRequestService ||
    dependencies.companyProposalService ||
    dependencies.companyAppointmentService ||
    dependencies.publicCompanyService ||
    dependencies.publicQuoteRequestService ||
    dependencies.templateAdminService ||
    dependencies.customerService ||
    dependencies.operationalMetricsService
  ) {
    return dependencies;
  }

  try {
    return createRuntimeDependenciesFromEnv();
  } catch (error) {
    logger.error({ error }, "Runtime dependencies could not be created.");
    return {};
  }
}

function createPublicRouterIfAvailable(dependencies: AppDependencies) {
  return dependencies.publicCompanyService
    ? createPublicRouter(
        dependencies.publicCompanyService,
        dependencies.publicQuoteRequestService,
      )
    : createUnavailablePublicRouter();
}

function createAuthRouterIfAvailable(authService?: AuthService) {
  return authService ? createAuthRouter(authService) : createUnavailableAuthRouter();
}

function createProtectedAdminRouterIfAvailable(dependencies: AppDependencies) {
  if (dependencies.tokenService && dependencies.adminService) {
    return [
      authenticate(dependencies.tokenService),
      authorizeAdmin,
      createAdminRouter(
        dependencies.adminService,
        dependencies.templateAdminService,
        dependencies.operationalMetricsService,
      ),
    ];
  }

  return createUnavailableAuthRouter();
}

function createProtectedCompanyRouterIfAvailable(dependencies: AppDependencies) {
  if (dependencies.tokenService && dependencies.companyAccountService) {
    return [
      authenticate(dependencies.tokenService),
      createCompanyRouter(
        dependencies.companyAccountService,
        dependencies.companyQuoteRequestService,
        dependencies.companyProposalService,
        dependencies.companyAppointmentService,
        dependencies.operationalMetricsService,
      ),
    ];
  }

  return createUnavailableAuthRouter();
}

function createProtectedCustomerRouterIfAvailable(dependencies: AppDependencies) {
  if (dependencies.tokenService && dependencies.customerService) {
    return [
      authenticate(dependencies.tokenService),
      createCustomerRouter(dependencies.customerService),
    ];
  }

  return createUnavailableAuthRouter();
}
