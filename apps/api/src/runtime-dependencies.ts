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
import { CompanyQuoteRequestService } from "./company/company-quote-request-service.js";
import { DrizzleCompanyAccountRepository } from "./company/drizzle-company-account-repository.js";
import { DrizzleCompanyQuoteRequestRepository } from "./company/drizzle-company-quote-request-repository.js";
import { env } from "./config/env.js";
import { createDatabaseClient } from "./db/client.js";
import { stubEmailAdapter } from "./notifications/email-adapter.js";
import { DrizzlePublicCompanyRepository } from "./public/drizzle-public-company-repository.js";
import { DrizzleQuoteRequestRepository } from "./public/drizzle-quote-request-repository.js";
import { PublicCompanyService } from "./public/public-service.js";
import { PublicQuoteRequestService } from "./public/public-quote-request-service.js";
import { DrizzleTemplateRepository } from "./templates/drizzle-template-repository.js";
import { TemplateAdminService } from "./templates/template-service.js";

export interface RuntimeDependencies {
  authService: ReturnType<typeof createAuthService>;
  tokenService: TokenService;
  adminService: AdminService;
  companyAccountService: CompanyAccountService;
  companyQuoteRequestService: CompanyQuoteRequestService;
  publicCompanyService: PublicCompanyService;
  publicQuoteRequestService: PublicQuoteRequestService;
  templateAdminService: TemplateAdminService;
}

export function createRuntimeDependenciesFromEnv(): RuntimeDependencies {
  if (!env.DATABASE_URL || !env.JWT_ACCESS_TOKEN_SECRET) {
    throw new AuthConfigurationError();
  }

  const { db } = createDatabaseClient(env.DATABASE_URL);
  const tokenService = createTokenServiceFromEnv();
  const publicCompanyRepository = new DrizzlePublicCompanyRepository(db);
  const templateRepository = new DrizzleTemplateRepository(db);
  const companyAccountRepository = new DrizzleCompanyAccountRepository(db);

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
    companyAccountService: new CompanyAccountService(companyAccountRepository),
    companyQuoteRequestService: new CompanyQuoteRequestService({
      accountRepository: companyAccountRepository,
      quoteRequestRepository: new DrizzleCompanyQuoteRequestRepository(db),
      templateRepository,
    }),
    publicCompanyService: new PublicCompanyService(publicCompanyRepository),
    publicQuoteRequestService: new PublicQuoteRequestService({
      publicCompanyRepository,
      templateRepository,
      quoteRequestRepository: new DrizzleQuoteRequestRepository(db),
      emailAdapter: stubEmailAdapter,
    }),
    templateAdminService: new TemplateAdminService(templateRepository),
  };
}
