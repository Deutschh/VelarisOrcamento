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
import { CompanyAppointmentService } from "./company/company-appointment-service.js";
import { CompanyProposalService } from "./company/company-proposal-service.js";
import { CompanyQuoteRequestService } from "./company/company-quote-request-service.js";
import { DrizzleCompanyAccountRepository } from "./company/drizzle-company-account-repository.js";
import { DrizzleCompanyAppointmentRepository } from "./company/drizzle-company-appointment-repository.js";
import { DrizzleCompanyProposalRepository } from "./company/drizzle-company-proposal-repository.js";
import { DrizzleCompanyQuoteRequestRepository } from "./company/drizzle-company-quote-request-repository.js";
import { env } from "./config/env.js";
import { CustomerService } from "./customer/customer-service.js";
import { DrizzleCustomerRepository } from "./customer/drizzle-customer-repository.js";
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
  companyProposalService: CompanyProposalService;
  companyAppointmentService: CompanyAppointmentService;
  publicCompanyService: PublicCompanyService;
  publicQuoteRequestService: PublicQuoteRequestService;
  templateAdminService: TemplateAdminService;
  customerService: CustomerService;
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
  const companyQuoteRequestRepository = new DrizzleCompanyQuoteRequestRepository(db);
  const companyProposalRepository = new DrizzleCompanyProposalRepository(db);
  const companyAppointmentRepository = new DrizzleCompanyAppointmentRepository(db);
  const customerRepository = new DrizzleCustomerRepository(db);
  const companyAppointmentService = new CompanyAppointmentService({
    accountRepository: companyAccountRepository,
    quoteRequestRepository: companyQuoteRequestRepository,
    proposalRepository: companyProposalRepository,
    appointmentRepository: companyAppointmentRepository,
    emailAdapter: stubEmailAdapter,
  });

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
      quoteRequestRepository: companyQuoteRequestRepository,
      templateRepository,
    }),
    companyProposalService: new CompanyProposalService({
      accountRepository: companyAccountRepository,
      quoteRequestRepository: companyQuoteRequestRepository,
      proposalRepository: companyProposalRepository,
      appointmentRepository: companyAppointmentRepository,
    }),
    companyAppointmentService,
    publicCompanyService: new PublicCompanyService(publicCompanyRepository),
    publicQuoteRequestService: new PublicQuoteRequestService({
      publicCompanyRepository,
      templateRepository,
      quoteRequestRepository: new DrizzleQuoteRequestRepository(db),
      companyAppointmentService,
      emailAdapter: stubEmailAdapter,
    }),
    templateAdminService: new TemplateAdminService(templateRepository),
    customerService: new CustomerService({
      repository: customerRepository,
    }),
  };
}
