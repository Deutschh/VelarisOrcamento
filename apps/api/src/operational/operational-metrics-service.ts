import { randomUUID } from "node:crypto";
import type {
  AdminAuditLogListResponse,
  AdminAuditLogQuery,
  AdminMetricsQuery,
  AdminOperationalMetricsResponse,
  AdminPriceChangeRequestListQuery,
  AdminPriceChangeRequestListResponse,
  AdminPriceChangeRequestResolve,
  AdminPriceChangeRequestResolveResponse,
  CompanyOperationalMetricsResponse,
  CompanyPriceChangeRequestCreate,
  CompanyPriceChangeRequestCreateResponse,
  CompanyPriceChangeRequestListResponse,
  MetricsPeriodQuery,
} from "@velaris/shared";

import type {
  CompanyAccountRepository,
  PersistedCompanyAccountStatus,
} from "../company/company-account-repository.js";
import {
  OperationalCompanyAccessDeniedError,
  PriceChangeRequestNotFoundError,
} from "./operational-errors.js";
import type { OperationalMetricsRepository } from "./operational-metrics-repository.js";

export interface OperationalMetricsServiceDependencies {
  accountRepository: CompanyAccountRepository;
  repository: OperationalMetricsRepository;
  now?: () => Date;
}

export class OperationalMetricsService {
  constructor(private readonly dependencies: OperationalMetricsServiceDependencies) {}

  async getCompanyMetrics(
    userId: string,
    query: MetricsPeriodQuery,
  ): Promise<CompanyOperationalMetricsResponse> {
    const account = await this.getCompanyAccount(userId, [
      "owner",
      "manager",
      "operator",
    ]);

    return this.dependencies.repository.getCompanyMetrics({
      companyId: account.companyId,
      query,
    });
  }

  async getAdminMetrics(
    query: AdminMetricsQuery,
  ): Promise<AdminOperationalMetricsResponse> {
    return this.dependencies.repository.getAdminMetrics(query);
  }

  async listAdminAuditLogs(
    query: AdminAuditLogQuery,
  ): Promise<AdminAuditLogListResponse> {
    return {
      auditLogs: await this.dependencies.repository.listAdminAuditLogs(query),
    };
  }

  async listCompanyPriceChangeRequests(
    userId: string,
  ): Promise<CompanyPriceChangeRequestListResponse> {
    const account = await this.getCompanyAccount(userId, [
      "owner",
      "manager",
      "operator",
    ]);

    return {
      priceChangeRequests:
        await this.dependencies.repository.listCompanyPriceChangeRequests(
          account.companyId,
        ),
    };
  }

  async createCompanyPriceChangeRequest(
    userId: string,
    input: CompanyPriceChangeRequestCreate,
  ): Promise<CompanyPriceChangeRequestCreateResponse> {
    const account = await this.getCompanyAccount(userId, ["owner", "manager"]);
    const priceChangeRequest =
      await this.dependencies.repository.createPriceChangeRequest({
        id: randomUUID(),
        companyId: account.companyId,
        actorUserId: userId,
        input,
        now: this.now(),
      });

    if (!priceChangeRequest) {
      throw new PriceChangeRequestNotFoundError();
    }

    return { priceChangeRequest };
  }

  async listAdminPriceChangeRequests(
    query: AdminPriceChangeRequestListQuery,
  ): Promise<AdminPriceChangeRequestListResponse> {
    return {
      priceChangeRequests:
        await this.dependencies.repository.listAdminPriceChangeRequests(query),
    };
  }

  async resolveAdminPriceChangeRequest(
    requestId: string,
    actorUserId: string,
    input: AdminPriceChangeRequestResolve,
  ): Promise<AdminPriceChangeRequestResolveResponse> {
    const priceChangeRequest =
      await this.dependencies.repository.resolvePriceChangeRequest({
        requestId,
        actorUserId,
        input,
        now: this.now(),
      });

    if (!priceChangeRequest) {
      throw new PriceChangeRequestNotFoundError();
    }

    return { priceChangeRequest };
  }

  private async getCompanyAccount(
    userId: string,
    allowedRoles: PersistedCompanyAccountStatus["memberRole"][],
  ): Promise<PersistedCompanyAccountStatus> {
    const account =
      await this.dependencies.accountRepository.findCompanyAccountByUserId(userId);

    if (!account || account.status !== "active") {
      throw new OperationalCompanyAccessDeniedError();
    }

    if (!allowedRoles.includes(account.memberRole)) {
      throw new OperationalCompanyAccessDeniedError();
    }

    return account;
  }

  private now() {
    return this.dependencies.now?.() ?? new Date();
  }
}
