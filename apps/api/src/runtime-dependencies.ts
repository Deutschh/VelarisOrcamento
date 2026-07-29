import { DrizzleAdminRepository } from "./admin/drizzle-admin-repository.js";
import { AdminService } from "./admin/admin-service.js";
import {
  createAuthService,
  createTokenServiceFromEnv,
} from "./auth/auth-dependencies.js";
import { AuthConfigurationError } from "./auth/auth-errors.js";
import { DrizzleAuthRepository } from "./auth/drizzle-auth-repository.js";
import type { TokenService } from "./auth/token-service.js";
import { CompanyAccountService } from "./company/company-account-service.js";
import { DrizzleCompanyAccountRepository } from "./company/drizzle-company-account-repository.js";
import { env } from "./config/env.js";
import { createDatabaseClient } from "./db/client.js";
import { stubEmailAdapter } from "./notifications/email-adapter.js";

export interface RuntimeDependencies {
  authService: ReturnType<typeof createAuthService>;
  tokenService: TokenService;
  adminService: AdminService;
  companyAccountService: CompanyAccountService;
}

export function createRuntimeDependenciesFromEnv(): RuntimeDependencies {
  if (!env.DATABASE_URL || !env.JWT_ACCESS_TOKEN_SECRET) {
    throw new AuthConfigurationError();
  }

  const { db } = createDatabaseClient(env.DATABASE_URL);
  const tokenService = createTokenServiceFromEnv();

  return {
    authService: createAuthService({
      repository: new DrizzleAuthRepository(db),
      tokenService,
      emailAdapter: stubEmailAdapter,
    }),
    tokenService,
    adminService: new AdminService({
      repository: new DrizzleAdminRepository(db),
      emailAdapter: stubEmailAdapter,
    }),
    companyAccountService: new CompanyAccountService(
      new DrizzleCompanyAccountRepository(db),
    ),
  };
}
